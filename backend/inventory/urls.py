from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ItemViewSet, DashboardStatsView

router = DefaultRouter()
router.register(r'items', ItemViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
]
