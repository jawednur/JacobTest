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

        # Create a mix of items
        Item.objects.create(name='Apple', type='ingredient', base_unit='kg')
        Item.objects.create(name='Banana', type='ingredient', base_unit='kg')
        Item.objects.create(name='Apple Pie', type='product', base_unit='single')

    def test_list_items(self):
        response = self.client.get('/api/inventory/items/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check pagination structure
        self.assertIn('count', response.data)
        self.assertIn('results', response.data)
        self.assertEqual(response.data['count'], 3)

    def test_filter_items_by_type(self):
        response = self.client.get('/api/inventory/items/', {'type': 'product'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['name'], 'Apple Pie')

    def test_search_items_by_name(self):
        response = self.client.get('/api/inventory/items/', {'search': 'Apple'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2) # Apple and Apple Pie
