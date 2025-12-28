from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from users.models import Store, CustomUser
from inventory.models import Item, Location, Inventory, ProductionLog, Recipe, StocktakeSession, StocktakeRecord
from inventory.services.inventory_service import InventoryService
from rest_framework.test import APIClient
from rest_framework import status
import time

class ExpirationTrackingTestCase(TestCase):
    def setUp(self):
        self.store = Store.objects.create(name="Test Store")
        self.user = CustomUser.objects.create_user(username="testuser", password="password")
        self.user.store = self.store
        self.user.save()
        
        self.location = Location.objects.create(store=self.store, name="Test Location")
        
        self.item = Item.objects.create(
            name="Expiring Product",
            type="product",
            base_unit="unit",
            shelf_life_days=10
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_production_log_sets_expiration_from_creation(self):
        # Create a recipe
        recipe = Recipe.objects.create(item=self.item, yield_quantity=1)
        
        # Log production
        prod_log = ProductionLog.objects.create(
            store=self.store,
            user=self.user,
            recipe=recipe,
            quantity_made=10,
            unit_type="unit",
            target_location=self.location
        )
        
        # Process logic
        InventoryService.process_production_log(prod_log)
        
        # Verify Inventory
        inv = Inventory.objects.get(store=self.store, item=self.item, location=self.location)
        self.assertIsNotNone(inv.created_at)
        self.assertIsNotNone(inv.expiration_date)
        
        # Check that expiration is roughly created_at + 10 days
        expected = inv.created_at + timedelta(days=10)
        delta = abs(inv.expiration_date - expected)
        self.assertLess(delta.total_seconds(), 5) # Within 5 seconds

    def test_shelf_life_update_recalculates_expiration(self):
        # 1. Create inventory with current shelf life (10 days)
        # Manually create to simulate existing stock
        now = timezone.now()
        inv = Inventory.objects.create(
            store=self.store,
            item=self.item,
            location=self.location,
            quantity=5,
            expiration_date=now + timedelta(days=10)
        )
        # Ensure created_at is set (auto_now_add does this, but we can't easily mock it back in time without hacking, 
        # so we rely on it being 'now')
        
        # 2. Update item shelf life to 20 days via API
        data = {
            "name": "Expiring Product",
            "type": "product",
            "base_unit": "unit",
            "shelf_life_days": 20
        }
        
        response = self.client.put(f'/api/inventory/items/{self.item.id}/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 3. Check inventory expiration
        inv.refresh_from_db()
        expected = inv.created_at + timedelta(days=20)
        delta = abs(inv.expiration_date - expected)
        
        self.assertLess(delta.total_seconds(), 5)

    def test_stocktake_addition_sets_fresh_expiration(self):
        # Start session
        session = StocktakeSession.objects.create(
            store=self.store,
            user=self.user,
            status='PENDING',
            type='ADDITION'
        )
        
        StocktakeRecord.objects.create(
            session=session,
            item=self.item,
            location=self.location,
            quantity_counted=5
        )
        
        # Finalize
        InventoryService.finalize_stocktake_session(session)
        
        # Check Inventory
        inv = Inventory.objects.get(store=self.store, item=self.item, location=self.location)
        self.assertIsNotNone(inv.created_at)
        
        expected = inv.created_at + timedelta(days=10)
        delta = abs(inv.expiration_date - expected)
        self.assertLess(delta.total_seconds(), 5)

