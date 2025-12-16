from django.db import models

# --- Organizational & Item Logic ---

class Location(models.Model):
    store = models.ForeignKey('users.Store', on_delete=models.CASCADE, related_name='locations')
    name = models.CharField(max_length=100)
    is_sales_floor = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.store.name} - {self.name}"

class Item(models.Model):
    """
    Represents a Global Item in the master catalog.
    Items are shared across all stores.
    Store-specific settings (like Pars and Default Locations) are in StoreItemSettings.
    """
    TYPE_CHOICES = (
        ('ingredient', 'Ingredient'),
        ('product', 'Product'),
    )
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    base_unit = models.CharField(max_length=50) # e.g., 'Gram', 'Single'

    # Global items might have a shelf life (Products), or not (Ingredients/Raw Materials).
    # If null, it means it doesn't expire or tracking isn't required globally.
    shelf_life_hours = models.IntegerField(default=24, null=True, blank=True)

    def __str__(self):
        return self.name

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
    # If yield_unit is Null, assume base_unit
    instructions = models.TextField(blank=True)

    def __str__(self):
        return f"Recipe for {self.item.name}"

class RecipeIngredient(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='ingredients')
    ingredient_item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='used_in_recipes')
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

    def __str__(self):
        return f"{self.item.name} at {self.location.name}: {self.quantity}"

class ProductionLog(models.Model):
    store = models.ForeignKey('users.Store', on_delete=models.CASCADE)
    user = models.ForeignKey('users.CustomUser', on_delete=models.SET_NULL, null=True)
    recipe = models.ForeignKey(Recipe, on_delete=models.SET_NULL, null=True)
    quantity_made = models.FloatField()
    unit_type = models.CharField(max_length=50, blank=True) # e.g. "Tins"
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
