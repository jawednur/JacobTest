from rest_framework import serializers
from .models import Item, Location, Inventory, UnitConversion, Recipe, ProductionLog, VarianceLog

class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = '__all__'

class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = '__all__'

class InventorySerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)

    class Meta:
        model = Inventory
        fields = ['id', 'store', 'store_name', 'location', 'location_name', 'item', 'item_name', 'quantity', 'expiration_date']

class ProductionLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    recipe_name = serializers.CharField(source='recipe.item.name', read_only=True)

    class Meta:
        model = ProductionLog
        fields = ['id', 'store', 'user', 'user_name', 'recipe', 'recipe_name', 'quantity_made', 'unit_type', 'timestamp']

class VarianceLogSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = VarianceLog
        fields = ['id', 'store', 'user', 'user_name', 'item', 'item_name', 'location', 'location_name', 'expected_quantity', 'actual_quantity', 'variance', 'timestamp']
