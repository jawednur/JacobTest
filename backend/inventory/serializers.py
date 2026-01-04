from rest_framework import serializers
from .models import Item, Location, Inventory, UnitConversion, Recipe, RecipeIngredient, RecipeStep, RecipeStepIngredient, ProductionLog, VarianceLog, StoreItemSettings, ReceivingLog, StocktakeSession, StocktakeRecord, ExpiredItemLog
import base64
import uuid
from django.core.files.base import ContentFile

class Base64ImageField(serializers.ImageField):
    def to_internal_value(self, data):
        if isinstance(data, str) and data.startswith('data:image'):
            # format: "data:image/png;base64,..."
            try:
                header, imgstr = data.split(';base64,')
                ext = header.split('/')[-1]
                if ext == 'jpeg':
                    ext = 'jpg'
                data = ContentFile(base64.b64decode(imgstr), name=f"{uuid.uuid4()}.{ext}")
            except Exception:
                raise serializers.ValidationError("Invalid Base64 image data")
        return super().to_internal_value(data)

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
    id = serializers.IntegerField(required=False)
    ingredients = RecipeStepIngredientSerializer(many=True, read_only=True)
    # Accept plain URL/text for images; upload handling is not implemented
    image = serializers.CharField(required=False, allow_null=True, allow_blank=True)

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
    steps = RecipeStepSerializer(many=True, required=False)
    ingredients = RecipeIngredientSerializer(many=True, required=False)

    class Meta:
        model = Recipe
        fields = ['id', 'item', 'item_name', 'base_unit', 'yield_quantity', 'yield_unit', 'yield_unit_details', 'instructions', 'steps', 'ingredients']

    def create(self, validated_data):
        steps_data = validated_data.pop('steps', [])
        ingredients_data = validated_data.pop('ingredients', [])
        recipe = Recipe.objects.create(**validated_data)
        
        for step_data in steps_data:
            # We don't support creating nested step ingredients here yet, just the step details
            RecipeStep.objects.create(recipe=recipe, **step_data)
        
        for ingredient_data in ingredients_data:
            RecipeIngredient.objects.create(recipe=recipe, **ingredient_data)
            
        return recipe

    def update(self, instance, validated_data):
        steps_data = validated_data.pop('steps', None)
        ingredients_data = validated_data.pop('ingredients', None)
        
        # Update scalar fields
        instance.yield_quantity = validated_data.get('yield_quantity', instance.yield_quantity)
        instance.yield_unit = validated_data.get('yield_unit', instance.yield_unit)
        instance.instructions = validated_data.get('instructions', instance.instructions)
        instance.save()
        
        # Update Steps
        if steps_data is not None:
            existing_steps = {s.id: s for s in instance.steps.all()}
            kept_ids = set()

            for step_data in steps_data:
                step_id = step_data.get('id')
                if step_id and step_id in existing_steps:
                    # Update existing
                    step_obj = existing_steps[step_id]
                    step_obj.step_number = step_data.get('step_number', step_obj.step_number)
                    step_obj.instruction = step_data.get('instruction', step_obj.instruction)
                    step_obj.caption = step_data.get('caption', step_obj.caption)
                    
                    if 'image' in step_data:
                        step_obj.image = step_data['image']
                    
                    step_obj.save()
                    kept_ids.add(step_id)
                else:
                    # Create new
                    # id might be present but invalid or None, ensure it's not passed to create
                    step_data.pop('id', None)
                    new_step = RecipeStep.objects.create(recipe=instance, **step_data)
                    kept_ids.add(new_step.id)

            # Delete removed steps
            for step_id, step_obj in existing_steps.items():
                if step_id not in kept_ids:
                    step_obj.delete()
                
        # Update Ingredients
        if ingredients_data is not None:
            instance.ingredients.all().delete()
            for ingredient_data in ingredients_data:
                RecipeIngredient.objects.create(recipe=instance, **ingredient_data)

        return instance

class ItemSerializer(serializers.ModelSerializer):
    par = serializers.SerializerMethodField()
    default_location = serializers.SerializerMethodField()
    conversions = UnitConversionSerializer(many=True, read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    is_global = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = ['id', 'name', 'type', 'base_unit', 'shelf_life_days', 'par', 'default_location', 'conversions', 'store', 'store_name', 'is_global']
        read_only_fields = ['store']

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

    def get_is_global(self, obj):
        return obj.store_id is None

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
    base_unit = serializers.CharField(source='item.base_unit', read_only=True)

    class Meta:
        model = Inventory
        fields = ['id', 'store', 'store_name', 'location', 'location_name', 'item', 'item_name', 'item_type', 'base_unit', 'quantity', 'expiration_date']
        extra_kwargs = {
            'store': {'required': False} 
        }

class ProductionLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    recipe_name = serializers.SerializerMethodField()

    class Meta:
        model = ProductionLog
        fields = ['id', 'store', 'user', 'user_name', 'recipe', 'recipe_name', 'quantity_made', 'unit_type', 'target_location', 'timestamp']
        read_only_fields = ['store', 'user', 'timestamp']

    def get_user_name(self, obj):
        return obj.user.username if obj.user else None

    def get_recipe_name(self, obj):
        # Recipe can be nullable; guard to avoid AttributeError in serializers
        if obj.recipe and obj.recipe.item:
            return obj.recipe.item.name
        return None

class VarianceLogSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = VarianceLog
        fields = ['id', 'store', 'user', 'user_name', 'item', 'item_name', 'location', 'location_name', 'expected_quantity', 'actual_quantity', 'variance', 'timestamp']
        read_only_fields = ['store', 'user', 'timestamp']

    def get_user_name(self, obj):
        return obj.user.username if obj.user else None

class ReceivingLogSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ReceivingLog
        fields = ['id', 'store', 'user', 'user_name', 'item', 'item_name', 'quantity', 'unit_cost', 'timestamp']
        read_only_fields = ['store', 'user', 'timestamp']

    def get_user_name(self, obj):
        return obj.user.username if obj.user else None

class StocktakeRecordSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    base_unit = serializers.CharField(source='item.base_unit', read_only=True)

    class Meta:
        model = StocktakeRecord
        fields = ['id', 'session', 'item', 'item_name', 'base_unit', 'location', 'location_name', 'quantity_counted']
        read_only_fields = ['session']

class StocktakeSessionSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = StocktakeSession
        fields = ['id', 'store', 'user', 'user_name', 'started_at', 'completed_at', 'status', 'type']
        read_only_fields = ['store', 'user', 'started_at', 'completed_at', 'status']

    def get_user_name(self, obj):
        return obj.user.username if obj.user else None

class ExpiredItemLogSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ExpiredItemLog
        fields = ['id', 'store', 'item', 'item_name', 'quantity_expired', 'disposed_at', 'user', 'user_name', 'notes']
        read_only_fields = ['store', 'user', 'disposed_at']

    def get_user_name(self, obj):
        return obj.user.username if obj.user else None

