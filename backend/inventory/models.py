from django.db import models
from django.utils import timezone

# --- Organizational & Item Logic ---

class Location(models.Model):
    store = models.ForeignKey('users.Store', on_delete=models.CASCADE, related_name='locations')
    name = models.CharField(max_length=100)
    is_sales_floor = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.store.name} - {self.name}"

class Item(models.Model):
    """
    Represents an Item in the catalog.
    If 'store' is null, it is a Global/Template Item shared across all stores.
    If 'store' is set, it is a Store-Specific Item.
    Store-specific settings (like Pars and Default Locations) are in StoreItemSettings.
    """
    TYPE_CHOICES = (
        ('ingredient', 'Ingredient'),
        ('product', 'Product'),
    )
    store = models.ForeignKey('users.Store', on_delete=models.CASCADE, null=True, blank=True, related_name='items')
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    base_unit = models.CharField(max_length=50) # e.g., 'Gram', 'Single'

    # Global items might have a shelf life (Products), or not (Ingredients/Raw Materials).
    # If null, it means it doesn't expire or tracking isn't required globally.
    shelf_life_days = models.IntegerField(default=1, null=True, blank=True)

    def __str__(self):
        return self.name

    def get_display_quantity_and_unit(self, quantity):
        """
        Converts a quantity in base units to the largest suitable display unit.
        Prioritizes 'is_default_display' conversion if set.
        """
        if quantity == 0:
            return 0, self.base_unit

        # 1. Check for Default Display Unit
        default_conversion = self.conversions.filter(is_default_display=True).first()
        if default_conversion and default_conversion.factor > 0:
             return quantity / default_conversion.factor, default_conversion.unit_name

        # 2. Fetch conversions sorted by factor descending to try largest units first
        conversions = self.conversions.all().order_by('-factor')
        
        for conversion in conversions:
            if conversion.factor > 0:
                val = quantity / conversion.factor
                # Allow fractional units if it's at least 0.25 (e.g. 1/4 cup)
                # This prevents "100g" being shown as "0.0001 tons" but allows "0.5 kg" or "0.8 cups"
                if val >= 0.25: 
                    return val, conversion.unit_name
        
        # Fallback to base unit
        return quantity, self.base_unit

class StoreItemSettings(models.Model):
    """
    Store-specific configuration for a Global Item.
    Allows each store to define their own Par levels and Default Locations.
    """
    store = models.ForeignKey('users.Store', on_delete=models.CASCADE, related_name='item_settings')
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='store_settings')
    default_location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True)
    par = models.FloatField(default=0.0)

    class Meta:
        unique_together = ('store', 'item')

    def __str__(self):
        return f"Settings for {self.item.name} at {self.store.name}"

class UnitConversion(models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='conversions')
    unit_name = models.CharField(max_length=50) # e.g., 'Box'
    factor = models.FloatField() # e.g., 28.0 (1 Box = 28.0 Base Units)
    is_default_display = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.unit_name} ({self.factor} x {self.item.base_unit})"

# --- Recipe Engine ---

class Recipe(models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='recipes')
    yield_quantity = models.FloatField()
    yield_unit = models.ForeignKey(UnitConversion, on_delete=models.SET_NULL, null=True, blank=True)
    # instructions field is deprecated in favor of RecipeStep model, but kept for backward compatibility/summary if needed.
    instructions = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        if self.yield_unit and self.yield_unit.item != self.item:
             pass 
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Recipe for {self.item.name}"

class RecipeStep(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='steps')
    step_number = models.PositiveIntegerField()
    instruction = models.TextField()
    image = models.ImageField(upload_to='recipe_steps/', null=True, blank=True)
    caption = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['step_number']

    def __str__(self):
        return f"Step {self.step_number} for {self.recipe.item.name}"

class RecipeStepIngredient(models.Model):
    step = models.ForeignKey(RecipeStep, on_delete=models.CASCADE, related_name='ingredients')
    ingredient = models.ForeignKey(
        Item, 
        on_delete=models.CASCADE, 
        limit_choices_to={'type': 'ingredient'}
    )
    # Quantity is now derived from the RecipeIngredient (Total Summary) and not specific to steps
    # to avoid double entry and confusion. Steps are just for instruction context.

    def __str__(self):
        return f"{self.ingredient.name} in step {self.step.step_number}"

class RecipeIngredient(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='ingredients')
    ingredient_item = models.ForeignKey(
        Item, 
        on_delete=models.CASCADE, 
        related_name='used_in_recipes',
        limit_choices_to={'type': 'ingredient'} # Filter to only ingredients
    )
    quantity_required = models.FloatField() # In Base Units of the ingredient

    def __str__(self):
        return f"{self.ingredient_item.name} in {self.recipe.item.name}"

# --- Inventory & Logs ---

class Inventory(models.Model):
    store = models.ForeignKey('users.Store', on_delete=models.CASCADE)
    location = models.ForeignKey(Location, on_delete=models.CASCADE)
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    quantity = models.FloatField() # Always in Base Units
    expiration_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.item.name} at {self.location.name}: {self.quantity}"

class ProductionLog(models.Model):
    store = models.ForeignKey('users.Store', on_delete=models.CASCADE)
    user = models.ForeignKey('users.CustomUser', on_delete=models.SET_NULL, null=True)
    recipe = models.ForeignKey(Recipe, on_delete=models.SET_NULL, null=True)
    quantity_made = models.FloatField()
    unit_type = models.CharField(max_length=50, blank=True) # e.g. "Tins"
    target_location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True) # Where the result goes
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} made {self.quantity_made} {self.unit_type} of {self.recipe.item.name}"

class VarianceLog(models.Model):
    store = models.ForeignKey('users.Store', on_delete=models.CASCADE)
    user = models.ForeignKey('users.CustomUser', on_delete=models.SET_NULL, null=True)
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    location = models.ForeignKey(Location, on_delete=models.CASCADE)
    expected_quantity = models.FloatField()
    actual_quantity = models.FloatField()
    variance = models.FloatField() # Actual - Expected
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Variance for {self.item.name}: {self.variance}"

# --- Analytics ---

class DailyUsage(models.Model):
    store = models.ForeignKey('users.Store', on_delete=models.CASCADE)
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    date = models.DateField()
    starting_count = models.FloatField()
    made_count = models.FloatField(default=0)
    received_count = models.FloatField(default=0)
    ending_count = models.FloatField()
    implied_consumption = models.FloatField() # Start + Made + Received - End

    class Meta:
        unique_together = ('store', 'item', 'date')

    def save(self, *args, **kwargs):
        self.implied_consumption = self.starting_count + self.made_count + self.received_count - self.ending_count
        super().save(*args, **kwargs)

# --- Receiving & Stocktake ---

class ReceivingLog(models.Model):
    store = models.ForeignKey('users.Store', on_delete=models.CASCADE)
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    quantity = models.FloatField()
    unit_cost = models.FloatField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey('users.CustomUser', on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"Received {self.quantity} of {self.item.name}"

class StocktakeSession(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )
    TYPE_CHOICES = (
        ('FULL', 'Full Stocktake'),
        ('ADDITION', 'Addition / Delivery'),
    )
    store = models.ForeignKey('users.Store', on_delete=models.CASCADE)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='FULL')
    user = models.ForeignKey('users.CustomUser', on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"Stocktake {self.id} ({self.status}) - {self.started_at}"

class StocktakeRecord(models.Model):
    session = models.ForeignKey(StocktakeSession, on_delete=models.CASCADE, related_name='records')
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    location = models.ForeignKey(Location, on_delete=models.CASCADE)
    quantity_counted = models.FloatField()

    def __str__(self):
        return f"Record {self.id} for {self.item.name}"

class ExpiredItemLog(models.Model):
    store = models.ForeignKey('users.Store', on_delete=models.CASCADE)
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    quantity_expired = models.FloatField()
    disposed_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey('users.CustomUser', on_delete=models.SET_NULL, null=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Expired: {self.quantity_expired} of {self.item.name}"
