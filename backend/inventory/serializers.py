from rest_framework import serializers
from .models import Item, Location, Inventory, UnitConversion, Recipe, RecipeIngredient, RecipeStep, RecipeStepIngredient, ProductionLog, VarianceLog, StoreItemSettings, ReceivingLog, StocktakeSession, StocktakeRecord, ExpiredItemLog

class UnitConversionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnitConversion
        fields = '__all__'

class RecipeStepIngredientSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='ingredient.name', read_only=True)
    location_name = serializers.SerializerMethodField()

    class Meta:
        model = RecipeStepIngredient
        fields = ['id', 'ingredient', 'item_name', 'location_name']

    def get_location_name(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        store = getattr(user, 'store', None) if user else None
        
        if store:
            inv = Inventory.objects.filter(store=store, item=obj.ingredient).first()
            if inv:
                return inv.location.name
            
            settings = StoreItemSettings.objects.filter(store=store, item=obj.ingredient).first()
            if settings and settings.default_location:
                return settings.default_location.name
        
        return "Unknown Location"

class RecipeStepSerializer(serializers.ModelSerializer):
    ingredients = RecipeStepIngredientSerializer(many=True, read_only=True)

    class Meta:
        model = RecipeStep
        fields = ['id', 'step_number', 'instruction', 'image', 'caption', 'ingredients']

class RecipeIngredientSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='ingredient_item.name', read_only=True)
    base_unit = serializers.CharField(source='ingredient_item.base_unit', read_only=True)
    display_quantity = serializers.SerializerMethodField()
    display_unit = serializers.SerializerMethodField()
    location_name = serializers.SerializerMethodField()

    class Meta:
        model = RecipeIngredient
        fields = ['id', 'ingredient_item', 'item_name', 'quantity_required', 'base_unit', 'display_quantity', 'display_unit', 'location_name']

    def get_display_quantity(self, obj):
        qty, _ = obj.ingredient_item.get_display_quantity_and_unit(obj.quantity_required)
        if qty == int(qty):
            return int(qty)
        return round(qty, 2)

    def get_display_unit(self, obj):
        _, unit = obj.ingredient_item.get_display_quantity_and_unit(obj.quantity_required)
        return unit
    
    def get_location_name(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        store = getattr(user, 'store', None) if user else None
        
        if store:
            inv = Inventory.objects.filter(store=store, item=obj.ingredient_item).first()
            if inv:
                return inv.location.name
            
            settings = StoreItemSettings.objects.filter(store=store, item=obj.ingredient_item).first()
            if settings and settings.default_location:
                return settings.default_location.name
        
        return "No Location Set"

class RecipeSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    base_unit = serializers.CharField(source='item.base_unit', read_only=True)
    yield_unit_details = UnitConversionSerializer(source='yield_unit', read_only=True)
    steps = RecipeStepSerializer(many=True, read_only=True)
    ingredients = RecipeIngredientSerializer(many=True, read_only=True)

    class Meta:
        model = Recipe
        fields = ['id', 'item', 'item_name', 'base_unit', 'yield_quantity', 'yield_unit', 'yield_unit_details', 'instructions', 'steps', 'ingredients']

class ItemSerializer(serializers.ModelSerializer):
    par = serializers.SerializerMethodField()
    default_location = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = ['id', 'name', 'type', 'base_unit', 'shelf_life_days', 'par', 'default_location']

    def get_par(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        store = getattr(user, 'store', None) if user else None
        
        if store:
            settings = StoreItemSettings.objects.filter(store=store, item=obj).first()
            if settings:
                return settings.par
        return 0.0

    def get_default_location(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        store = getattr(user, 'store', None) if user else None
        
        if store:
            settings = StoreItemSettings.objects.filter(store=store, item=obj).first()
            if settings and settings.default_location:
                return settings.default_location.id
        return None

class StoreItemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreItemSettings
        fields = '__all__'

class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = '__all__'

class InventorySerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_type = serializers.CharField(source='item.type', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)

    class Meta:
        model = Inventory
        fields = ['id', 'store', 'store_name', 'location', 'location_name', 'item', 'item_name', 'item_type', 'quantity', 'expiration_date']
        extra_kwargs = {
            'store': {'required': False} 
        }

class ProductionLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    recipe_name = serializers.CharField(source='recipe.item.name', read_only=True)

    class Meta:
        model = ProductionLog
        fields = ['id', 'store', 'user', 'user_name', 'recipe', 'recipe_name', 'quantity_made', 'unit_type', 'target_location', 'timestamp']
        read_only_fields = ['store', 'user', 'timestamp']

class VarianceLogSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = VarianceLog
        fields = ['id', 'store', 'user', 'user_name', 'item', 'item_name', 'location', 'location_name', 'expected_quantity', 'actual_quantity', 'variance', 'timestamp']
        read_only_fields = ['store', 'user', 'timestamp']

class ReceivingLogSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = ReceivingLog
        fields = ['id', 'store', 'user', 'user_name', 'item', 'item_name', 'quantity', 'unit_cost', 'timestamp']
        read_only_fields = ['store', 'user', 'timestamp']

class StocktakeRecordSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    base_unit = serializers.CharField(source='item.base_unit', read_only=True)

    class Meta:
        model = StocktakeRecord
        fields = ['id', 'session', 'item', 'item_name', 'base_unit', 'location', 'location_name', 'quantity_counted']
        read_only_fields = ['session']

class StocktakeSessionSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = StocktakeSession
        fields = ['id', 'store', 'user', 'user_name', 'started_at', 'completed_at', 'status']
        read_only_fields = ['store', 'user', 'started_at', 'completed_at', 'status']

class ExpiredItemLogSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = ExpiredItemLog
        fields = ['id', 'store', 'item', 'item_name', 'quantity_expired', 'disposed_at', 'user', 'user_name', 'notes']
        read_only_fields = ['store', 'user', 'disposed_at']

