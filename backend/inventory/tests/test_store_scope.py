from django.test import TestCase
from users.models import Store, CustomUser
from inventory.models import Item, Location, StoreItemSettings

class StoreScopeTestCase(TestCase):
    def setUp(self):
        # Create Stores
        self.store_a = Store.objects.create(name="Store A")
        self.store_b = Store.objects.create(name="Store B")

        # Create Locations
        self.loc_a_pantry = Location.objects.create(store=self.store_a, name="Pantry")
        self.loc_b_walkin = Location.objects.create(store=self.store_b, name="Walk-in")

        # Create Global Item
        self.flour = Item.objects.create(
            name="Flour",
            type="ingredient",
            base_unit="Gram",
            shelf_life_days=None # Ingredients don't have shelf life
        )

        self.cake = Item.objects.create(
            name="Cake",
            type="product",
            base_unit="Slice",
            shelf_life_days=3 # Products do
        )

    def test_global_item_local_settings(self):
        """
        Verify that a single Global Item can have different settings per store.
        """
        # Store A settings for Flour
        settings_a = StoreItemSettings.objects.create(
            store=self.store_a,
            item=self.flour,
            par=1000.0,
            default_location=self.loc_a_pantry
        )

        # Store B settings for Flour
        settings_b = StoreItemSettings.objects.create(
            store=self.store_b,
            item=self.flour,
            par=5000.0,
            default_location=self.loc_b_walkin
        )

        # Assertions
        self.assertEqual(settings_a.par, 1000.0)
        self.assertEqual(settings_b.par, 5000.0)

        self.assertNotEqual(settings_a.default_location, settings_b.default_location)
        self.assertEqual(settings_a.default_location.store, self.store_a)
        self.assertEqual(settings_b.default_location.store, self.store_b)

    def test_shelf_life_nullability(self):
        """
        Verify that shelf_life_days can be null for ingredients.
        """
        self.assertIsNone(self.flour.shelf_life_days)
        self.assertEqual(self.cake.shelf_life_days, 3)
