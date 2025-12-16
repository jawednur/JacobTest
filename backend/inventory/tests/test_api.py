from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from inventory.models import Item

User = get_user_model()

class InventoryAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpassword')
        self.client.force_authenticate(user=self.user)
        self.item_data = {
            'name': 'Test Item',
            'type': 'ingredient',
            'base_unit': 'kg',
            'shelf_life_hours': 24
        }
        self.item = Item.objects.create(**self.item_data)

    def test_get_items(self):
        response = self.client.get('/api/items/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # With pagination, response.data is a dict with 'results'
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)

    def test_create_item(self):
        new_item_data = {
            'name': 'New Item',
            'type': 'product',
            'base_unit': 'box',
            'shelf_life_hours': 48
        }
        response = self.client.post('/api/items/', new_item_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Item.objects.count(), 2)

    def test_dashboard_stats(self):
        response = self.client.get('/api/dashboard/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('low_stock_count', response.data)
        self.assertIn('expiring_today_count', response.data)
