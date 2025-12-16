from rest_framework import viewsets, permissions, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import Item, Inventory, ProductionLog, VarianceLog
from .serializers import ItemSerializer, InventorySerializer, ProductionLogSerializer, VarianceLogSerializer

class ItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows items to be viewed or edited.
    """
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['type']
    search_fields = ['name']

class DashboardStatsView(APIView):
    """
    API endpoint for dashboard statistics.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        # Assuming user has a store, filtered by store. If not, show all (or handle as needed).
        # The prompt says "CustomUser model with role (Admin/Employee) and store_id fields".
        # Let's check users.models to be sure about store_id access.

        # For now, I'll filter by store if the user has one, otherwise all.
        store_id = getattr(user, 'store_id', None)

        inventory_qs = Inventory.objects.all()
        if store_id:
            inventory_qs = inventory_qs.filter(store_id=store_id)

        # 1. Low Stock
        # Defining "Low Stock" as quantity < 10 for now (can be improved with a threshold field later)
        low_stock_count = inventory_qs.filter(quantity__lt=10).count()

        # 2. Expiring Today
        today = timezone.now().date()
        expiring_today_count = inventory_qs.filter(expiration_date__date=today).count()

        # 3. Recent Activity (Production Logs)
        prod_logs_qs = ProductionLog.objects.all()
        if store_id:
            prod_logs_qs = prod_logs_qs.filter(store_id=store_id)
        recent_production = prod_logs_qs.order_by('-timestamp')[:5]
        recent_production_data = ProductionLogSerializer(recent_production, many=True).data

        # 4. Total Items (in inventory)
        total_inventory_items = inventory_qs.count()

        data = {
            "low_stock_count": low_stock_count,
            "expiring_today_count": expiring_today_count,
            "total_inventory_items": total_inventory_items,
            "recent_activity": recent_production_data
        }
        return Response(data)
