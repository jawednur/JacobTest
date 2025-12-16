from django.contrib import admin
from .models import (
    Location, Item, StoreItemSettings, UnitConversion, Recipe, RecipeIngredient,
    Inventory, ProductionLog, VarianceLog, DailyUsage
)

@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'store', 'is_sales_floor')
    list_filter = ('store', 'is_sales_floor')

@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'base_unit', 'shelf_life_hours')
    list_filter = ('type',)
    search_fields = ('name',)

@admin.register(StoreItemSettings)
class StoreItemSettingsAdmin(admin.ModelAdmin):
    list_display = ('store', 'item', 'par', 'default_location')
    list_filter = ('store',)
    search_fields = ('item__name',)

class UnitConversionInline(admin.TabularInline):
    model = UnitConversion
    extra = 1

@admin.register(UnitConversion)
class UnitConversionAdmin(admin.ModelAdmin):
    list_display = ('item', 'unit_name', 'factor')

class RecipeIngredientInline(admin.TabularInline):
    model = RecipeIngredient
    extra = 1

@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ('item', 'yield_quantity')
    inlines = [RecipeIngredientInline]

@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ('item', 'store', 'location', 'quantity', 'expiration_date')
    list_filter = ('store', 'location')

@admin.register(ProductionLog)
class ProductionLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'recipe', 'quantity_made', 'timestamp')
    list_filter = ('store', 'timestamp')

@admin.register(VarianceLog)
class VarianceLogAdmin(admin.ModelAdmin):
    list_display = ('item', 'variance', 'timestamp')

@admin.register(DailyUsage)
class DailyUsageAdmin(admin.ModelAdmin):
    list_display = ('item', 'date', 'implied_consumption')
    list_filter = ('store', 'date')
