from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from users.models import Store, CustomUser
from inventory.models import Item, Location, Recipe, Inventory, ProductionLog
from inventory.services.inventory_service import InventoryService

class ExpirationCalculationTestCase(TestCase):
    def setUp(self):
        self.store = Store.objects.create(name="Test Store")
        self.user = CustomUser.objects.create_user(username="testuser", password="password")
        self.location = Location.objects.create(store=self.store, name="Test Location")
        
        # Create an item with 5 days shelf life
        self.item = Item.objects.create(
            name="Perishable Item",
            type="product",
            base_unit="unit",
            shelf_life_days=5
        )
        
        # Create a recipe for this item (simple 1-to-1 production for testing)
        self.recipe = Recipe.objects.create(
            item=self.item,
            yield_quantity=1.0
        )
        # Assuming recipe has no ingredients for this test to simplify, 
        # or we can add one if validation requires it.
        # InventoryService.process_production_log requires ingredients loops?
        # Let's check logic:
        # for ingredient in recipe.ingredients.all(): ...
        # If no ingredients, it just skips that part and goes to "if production_log.target_location:"

    def test_production_log_sets_expiration(self):
        # Create a production log
        log = ProductionLog.objects.create(
            store=self.store,
            user=self.user,
            recipe=self.recipe,
            quantity_made=10.0,
            unit_type="unit",
            target_location=self.location
        )
        
        # Process the log
        InventoryService.process_production_log(log)
        
        # Check inventory
        inv = Inventory.objects.get(store=self.store, item=self.item, location=self.location)
        
        # Check expiration date
        # Should be roughly now + 5 days
        now = timezone.now()
        expected_expiry = now + timedelta(days=5)
        
        # Allow small time difference (e.g. 1 second)
        self.assertIsNotNone(inv.expiration_date)
        delta = abs(inv.expiration_date - expected_expiry)
        self.assertLess(delta.total_seconds(), 5)
        
    def test_item_without_shelf_life(self):
        item_no_expiry = Item.objects.create(
            name="Non-perishable",
            type="product",
            base_unit="unit",
            shelf_life_days=None
        )
        recipe_no_expiry = Recipe.objects.create(
            item=item_no_expiry,
            yield_quantity=1.0
        )
        
        log = ProductionLog.objects.create(
            store=self.store,
            user=self.user,
            recipe=recipe_no_expiry,
            quantity_made=10.0,
            unit_type="unit",
            target_location=self.location
        )
        
        InventoryService.process_production_log(log)
        
        inv = Inventory.objects.get(store=self.store, item=item_no_expiry, location=self.location)
        self.assertIsNone(inv.expiration_date)





