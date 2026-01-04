from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

from users.models import Store
from inventory.models import Item, Location, StoreItemSettings

User = get_user_model()


class ItemPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Stores and locations
        self.store_a = Store.objects.create(name="Store A")
        self.store_b = Store.objects.create(name="Store B")
        self.loc_a = Location.objects.create(store=self.store_a, name="Pantry")
        self.loc_b = Location.objects.create(store=self.store_b, name="Walk-in")

        # Users
        self.super_user = User.objects.create_superuser(username='super', password='pass')
        self.admin_a = User.objects.create_user(username='admin_a', password='pass', role='admin', store=self.store_a)
        self.admin_b = User.objects.create_user(username='admin_b', password='pass', role='admin', store=self.store_b)

        # Global item baseline
        self.global_item = Item.objects.create(name="Global Flour", type="ingredient", base_unit="g", store=None)

    def test_admin_cannot_create_global_item(self):
        self.client.force_authenticate(user=self.admin_a)
        resp = self.client.post('/api/inventory/items/', {
            'name': 'Attempt Global',
            'type': 'ingredient',
            'base_unit': 'kg',
            'is_global': True
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Item.objects.filter(name='Attempt Global').exists())

    def test_super_can_create_global_item(self):
        self.client.force_authenticate(user=self.super_user)
        resp = self.client.post('/api/inventory/items/', {
            'name': 'Super Global',
            'type': 'product',
            'base_unit': 'box',
            'shelf_life_days': 2,
            'is_global': True
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        created = Item.objects.get(name='Super Global')
        self.assertIsNone(created.store)

    def test_admin_store_items_are_bound_to_store(self):
        self.client.force_authenticate(user=self.admin_a)
        resp = self.client.post('/api/inventory/items/', {
            'name': 'Local Item',
            'type': 'ingredient',
            'base_unit': 'kg'
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        created = Item.objects.get(name='Local Item')
        self.assertEqual(created.store, self.store_a)

    def test_admin_cannot_edit_global_item(self):
        self.client.force_authenticate(user=self.admin_a)
        resp = self.client.patch(f'/api/inventory/items/{self.global_item.id}/', {'name': 'Nope'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.global_item.refresh_from_db()
        self.assertEqual(self.global_item.name, 'Global Flour')

    def test_admin_cannot_edit_other_store_item(self):
        other_item = Item.objects.create(name="Other Store Item", type="ingredient", base_unit="kg", store=self.store_b)
        self.client.force_authenticate(user=self.admin_a)
        resp = self.client.patch(f'/api/inventory/items/{other_item.id}/', {'name': 'Nope'}, format='json')
        # Hidden by queryset restriction
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_configure_global_item_for_store(self):
        self.client.force_authenticate(user=self.admin_a)
        resp = self.client.post(f'/api/inventory/items/{self.global_item.id}/configure_for_store/', {
            'par': 10,
            'default_location': self.loc_a.id
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        settings = StoreItemSettings.objects.get(store=self.store_a, item=self.global_item)
        self.assertEqual(settings.par, 10)
        self.assertEqual(settings.default_location, self.loc_a)

    def test_configure_rejects_foreign_location(self):
        self.client.force_authenticate(user=self.admin_a)
        resp = self.client.post(f'/api/inventory/items/{self.global_item.id}/configure_for_store/', {
            'par': 5,
            'default_location': self.loc_b.id  # belongs to store_b
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(StoreItemSettings.objects.filter(store=self.store_a, item=self.global_item).exists())

