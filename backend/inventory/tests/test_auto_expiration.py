from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from users.models import Store, CustomUser
from inventory.models import Item, Location, Inventory
from inventory.services.inventory_service import InventoryService
from rest_framework.test import APIClient
from rest_framework import status

class ExpirationCalculationTestCase(TestCase):
    def setUp(self):
        self.store = Store.objects.create(name="Test Store")
        self.user = CustomUser.objects.create_user(username="testuser", password="password")
        self.location = Location.objects.create(store=self.store, name="Test Location")
        
        self.item = Item.objects.create(
            name="Perishable Item",
            type="product",
            base_unit="unit",
            shelf_life_days=5
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_manual_creation_via_api_sets_expiration(self):
        # The user has to be associated with a store usually, or we pass it if admin
        # In InventoryViewSet logic: store = getattr(user, 'store', None)
        # So let's attach store to user
        self.user.store = self.store
        self.user.save()

        data = {
            "item": self.item.id,
            "location": self.location.id,
            "quantity": 10
        }
        
        response = self.client.post('/api/inventory/inventory/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        inv_id = response.data['id']
        inv = Inventory.objects.get(id=inv_id)
        
        self.assertIsNotNone(inv.expiration_date)
        # Should be approx 5 days from now
        expected = timezone.now() + timedelta(days=5)
        delta = abs(inv.expiration_date - expected)
        self.assertLess(delta.total_seconds(), 5)

    def test_stocktake_creation_sets_expiration(self):
        # Stocktake logic uses: InventoryService.process_stocktake(store, user, stock_data)
        
        stock_data = [{
            "item_id": self.item.id,
            "location_id": self.location.id,
            "actual_quantity": 20,
            "unit_name": "unit"
        }]
        
        InventoryService.process_stocktake(self.store, self.user, stock_data)
        
        inv = Inventory.objects.get(store=self.store, item=self.item, location=self.location)
        self.assertEqual(inv.quantity, 20)
        self.assertIsNotNone(inv.expiration_date)
        
        expected = timezone.now() + timedelta(days=5)
        delta = abs(inv.expiration_date - expected)
        self.assertLess(delta.total_seconds(), 5)

    def test_stocktake_session_finalization_sets_expiration(self):
        from inventory.models import StocktakeSession, StocktakeRecord
        
        # Create session
        session = StocktakeSession.objects.create(
            store=self.store,
            user=self.user,
            status='PENDING',
            type='FULL'
        )
        
        # Create record for new location
        new_location = Location.objects.create(store=self.store, name="New Shelf")
        StocktakeRecord.objects.create(
            session=session,
            item=self.item,
            location=new_location,
            quantity_counted=5
        )
        
        # Finalize
        InventoryService.finalize_stocktake_session(session)
        
        # Check inventory
        inv = Inventory.objects.get(store=self.store, item=self.item, location=new_location)
        self.assertEqual(inv.quantity, 5)
        self.assertIsNotNone(inv.expiration_date)
        
        expected = timezone.now() + timedelta(days=5)
        delta = abs(inv.expiration_date - expected)
        self.assertLess(delta.total_seconds(), 5)

