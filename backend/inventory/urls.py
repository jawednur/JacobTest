from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ItemViewSet, DashboardStatsView, ProductionLogViewSet, StocktakeView, 
    InventoryViewSet, LocationViewSet, UnitConversionViewSet, RecipeViewSet,
    ReceivingLogViewSet, StocktakeSessionViewSet, ExpiredItemLogViewSet,
    AnalyticsView
)

router = DefaultRouter()
router.register(r'items', ItemViewSet)
router.register(r'recipes', RecipeViewSet)
router.register(r'production-logs', ProductionLogViewSet)
router.register(r'receiving-logs', ReceivingLogViewSet)
router.register(r'stocktake-sessions', StocktakeSessionViewSet)
router.register(r'inventory', InventoryViewSet)
router.register(r'locations', LocationViewSet)
router.register(r'unit-conversions', UnitConversionViewSet)
router.register(r'expired-logs', ExpiredItemLogViewSet)

urlpatterns = [
    path('inventory/dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('inventory/stocktake/', StocktakeView.as_view(), name='stocktake'),
    path('inventory/analytics/', AnalyticsView.as_view(), name='analytics'),
    path('inventory/', include(router.urls)),
]
