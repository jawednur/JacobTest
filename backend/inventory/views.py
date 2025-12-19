from rest_framework import viewsets, permissions, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q
from .models import Item, Inventory, ProductionLog, VarianceLog, Location, UnitConversion, Recipe, ReceivingLog, StocktakeSession, StocktakeRecord, ExpiredItemLog
from .serializers import ItemSerializer, InventorySerializer, ProductionLogSerializer, VarianceLogSerializer, LocationSerializer, UnitConversionSerializer, RecipeSerializer, ReceivingLogSerializer, StocktakeSessionSerializer, StocktakeRecordSerializer, ExpiredItemLogSerializer
from .services.inventory_service import InventoryService
from datetime import timedelta

class ItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows items to be viewed or edited.
    Includes logic to handle 'par' updates in StoreItemSettings.
    """
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['type']
    search_fields = ['name']

    def get_queryset(self):
        user = self.request.user
        store = getattr(user, 'store', None)
        
        if store:
            # Show Global Items + Store-Specific Items
            return Item.objects.filter(Q(store=store) | Q(store__isnull=True))
        
        if user.is_staff:
            return Item.objects.all()
            
        return Item.objects.filter(store__isnull=True)

    def perform_update(self, serializer):
        item = serializer.save()
        user = self.request.user
        store = getattr(user, 'store', None)
        
        # Handle 'par' updates
        if store and 'par' in self.request.data:
            try:
                par_value = float(self.request.data['par'])
                from .models import StoreItemSettings
                settings, created = StoreItemSettings.objects.get_or_create(store=store, item=item)
                settings.par = par_value
                settings.save()
            except (ValueError, TypeError):
                pass 

        # Handle 'default_location' updates
        if store and 'default_location' in self.request.data:
            try:
                location_id = int(self.request.data['default_location']) if self.request.data['default_location'] else None
                from .models import StoreItemSettings
                settings, created = StoreItemSettings.objects.get_or_create(store=store, item=item)
                settings.default_location_id = location_id
                settings.save()
            except (ValueError, TypeError):
                pass

    def perform_create(self, serializer):
        user = self.request.user
        store = getattr(user, 'store', None)
        
        # Save item with store context
        item = serializer.save(store=store)
        
        if store:
            from .models import StoreItemSettings
            # We can create settings immediately
            par_value = 0.0
            location_id = None
            
            if 'par' in self.request.data:
                try:
                    par_value = float(self.request.data['par'])
                except (ValueError, TypeError):
                    pass
            
            if 'default_location' in self.request.data:
                try:
                    location_id = int(self.request.data['default_location']) if self.request.data['default_location'] else None
                except (ValueError, TypeError):
                    pass

            if par_value > 0 or location_id:
                StoreItemSettings.objects.create(store=store, item=item, par=par_value, default_location_id=location_id)
            
            # Auto-create recipe if type is product
            if item.type == 'product':
                Recipe.objects.create(
                    item=item,
                    yield_quantity=1.0, # Default yield
                    instructions="Auto-generated recipe for product."
                )
        elif item.type == 'product':
             # Global item that is a product - should it have a global recipe?
             # Yes, usually.
             Recipe.objects.create(
                item=item,
                yield_quantity=1.0,
                instructions="Auto-generated recipe for product."
             )

class RecipeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing recipes.
    """
    queryset = Recipe.objects.all()
    serializer_class = RecipeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['item']
    search_fields = ['item__name']

    def get_queryset(self):
        user = self.request.user
        store = getattr(user, 'store', None)
        
        if store:
             # Return all products (items with type='product') + any items that have recipes
             # But ProductionLogPage expects a Recipe object, not an Item object. 
             # Wait, ProductionLogPage uses getRecipesList -> /inventory/recipes/
             # So we need to ensure every Product has a Recipe, OR we need to return a "dummy" recipe for Products?
             
             # The user asked: "if it is a product, it should imediatly be on of the product options under log prep"
             # Currently log prep iterates 'recipes'. 
             # If I create a product item, I don't necessarily create a Recipe for it immediately.
             # So we should auto-create a default Recipe for every Product Item? 
             # OR we should modify this view to return a "Recipe-like" structure for all Products.
             
             # Option 1: Auto-create Recipe on Item creation (cleanest for consistency)
             # Let's check ItemViewSet.perform_create
             
             visible_items = Item.objects.filter(Q(store=store) | Q(store__isnull=True))
             return Recipe.objects.filter(item__in=visible_items)
        
        if user.is_staff:
             return Recipe.objects.all()

        return Recipe.objects.filter(item__store__isnull=True)


class InventoryViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows viewing and managing full inventory details.
    """
    queryset = Inventory.objects.all()
    serializer_class = InventorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['store', 'location', 'item__type']
    search_fields = ['item__name']

    def get_queryset(self):
        # Filter by user's store
        user = self.request.user
        store = getattr(user, 'store', None)
        if store:
            return Inventory.objects.filter(store=store)
        return Inventory.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        store = getattr(user, 'store', None)
        
        # Determine expiration if item has shelf life
        item = serializer.validated_data.get('item')
        expiration_date = serializer.validated_data.get('expiration_date')
        
        if not expiration_date and item and item.shelf_life_days is not None:
             expiration_date = timezone.now() + timedelta(days=item.shelf_life_days)
        
        if store:
             serializer.save(store=store, expiration_date=expiration_date)
        else:
             serializer.save(expiration_date=expiration_date)

    @action(detail=False, methods=['get'])
    def expired(self, request):
        user = request.user
        store = getattr(user, 'store', None)
        if not store:
            return Response({"error": "No store context"}, status=400)
            
        today = timezone.now().date()
        expired_qs = Inventory.objects.filter(store=store, expiration_date__date__lt=today, quantity__gt=0)
        serializer = self.get_serializer(expired_qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def dispose(self, request, pk=None):
        inventory = self.get_object()
        user = request.user
        store = getattr(user, 'store', None)
        
        # Log the disposal
        ExpiredItemLog.objects.create(
            store=store,
            item=inventory.item,
            quantity_expired=inventory.quantity,
            user=user,
            notes=request.data.get('notes', '')
        )
        
        # Delete the inventory record (or set to 0? usually we remove expired stock entirely or move to waste)
        # Assuming we just delete the specific inventory record as it is expired batch
        inventory.delete()
        
        return Response({"message": "Expired item disposed and logged."})

class LocationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for locations.
    """
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    
    def get_queryset(self):
        user = self.request.user
        store = getattr(user, 'store', None)
        if store:
            return Location.objects.filter(store=store)
        return Location.objects.none()

class UnitConversionViewSet(viewsets.ModelViewSet):
    """
    API endpoint for unit conversions.
    """
    queryset = UnitConversion.objects.all()
    serializer_class = UnitConversionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['item']

    def get_queryset(self):
        user = self.request.user
        store = getattr(user, 'store', None)
        
        if store:
             visible_items = Item.objects.filter(Q(store=store) | Q(store__isnull=True))
             return UnitConversion.objects.filter(item__in=visible_items)
             
        if user.is_staff:
             return UnitConversion.objects.all()
        
        return UnitConversion.objects.filter(item__store__isnull=True)


class ProductionLogViewSet(viewsets.ModelViewSet):
    """
    API endpoint for logging production (Prep).
    Creation triggers inventory deduction via signals.
    """
    queryset = ProductionLog.objects.all()
    serializer_class = ProductionLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['store']

    def perform_create(self, serializer):
        user = self.request.user
        store = getattr(user, 'store', None)
        force = self.request.data.get('force_creation', False)
        
        # 1. Create instance in memory
        if store:
             production_log = serializer.save(user=user, store=store)
        else:
             production_log = serializer.save(user=user)
        
        # 2. Process logic (Check + Deduct)
        # Note: We removed the signal, so we MUST call this manually.
        result = InventoryService.process_production_log(production_log, force=force)
        
        if result and 'missing_ingredients' in result:
            # Rollback creation
            production_log.delete()
            
            # Raise Conflict
            from rest_framework.exceptions import APIException
            class Conflict(APIException):
                status_code = 409
                default_detail = 'Ingredient conflict.'
                default_code = 'conflict'

            exc = Conflict(detail={"message": "Missing ingredients", "missing_ingredients": result['missing_ingredients']})
            raise exc

class StocktakeView(APIView):
    """
    API endpoint to submit a stock count and generate variance.
    (Legacy/Simple View)
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        store = getattr(user, 'store', None)
        
        if not store:
            return Response({"error": "User does not belong to a store."}, status=status.HTTP_400_BAD_REQUEST)
            
        stock_data = request.data.get('counts', [])
        if not stock_data:
            return Response({"error": "No counts provided."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            variance_logs = InventoryService.process_stocktake(store, user, stock_data)
            serializer = VarianceLogSerializer(variance_logs, many=True)
            return Response({
                "message": "Stocktake processed successfully.",
                "variances": serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DashboardStatsView(APIView):
    """
    API endpoint for dashboard statistics.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        store_id = getattr(user, 'store_id', None)

        inventory_qs = Inventory.objects.all()
        if store_id:
            inventory_qs = inventory_qs.filter(store_id=store_id)

        # 1. Low Stock
        low_stock_items = []
        low_stock_count = 0
        
        if store_id:
            from .models import StoreItemSettings
            from django.db.models import Sum
            
            # Get items with par levels > 0 for this store
            settings = StoreItemSettings.objects.filter(store_id=store_id, par__gt=0).select_related('item')
            
            for setting in settings:
                # Calculate total quantity for this item across all locations in the store
                total_qty = Inventory.objects.filter(store_id=store_id, item=setting.item).aggregate(Sum('quantity'))['quantity__sum'] or 0
                
                if total_qty < setting.par:
                    low_stock_items.append({
                        'id': setting.item.id,
                        'name': setting.item.name,
                        'quantity': total_qty,
                        'par_level': setting.par,
                        'deficit': setting.par - total_qty,
                        'unit': setting.item.base_unit
                    })
            low_stock_count = len(low_stock_items)
        else:
             # Fallback logic if no store context (e.g. counting individual inventory entries < 10)
             low_stock_count = inventory_qs.filter(quantity__lt=10).count()

        # 2. Expiration Logic
        today = timezone.now().date()
        
        # Expiring Today
        expiring_today_qs = inventory_qs.filter(expiration_date__date=today)
        expiring_today_count = expiring_today_qs.count()
        expiring_today_items = InventorySerializer(expiring_today_qs, many=True).data

        # Expired (Past)
        expired_qs = inventory_qs.filter(expiration_date__date__lt=today)
        expired_count = expired_qs.count()
        expired_items = InventorySerializer(expired_qs, many=True).data

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
            "low_stock_items": low_stock_items,
            "expiring_today_count": expiring_today_count,
            "expiring_today_items": expiring_today_items,
            "expired_count": expired_count,
            "expired_items": expired_items,
            "total_inventory_items": total_inventory_items,
            "recent_activity": recent_production_data
        }
        return Response(data)

class ReceivingLogViewSet(viewsets.ModelViewSet):
    """
    API endpoint for receiving logs.
    Creation triggers inventory update.
    """
    queryset = ReceivingLog.objects.all()
    serializer_class = ReceivingLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['store', 'item']

    def perform_create(self, serializer):
        user = self.request.user
        store = getattr(user, 'store', None)
        
        if store:
             receiving_log = serializer.save(user=user, store=store)
        else:
             receiving_log = serializer.save(user=user)
        
        InventoryService.process_receiving_log(receiving_log)

class StocktakeSessionViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing stocktake sessions.
    """
    queryset = StocktakeSession.objects.all()
    serializer_class = StocktakeSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        store = getattr(user, 'store', None)
        if store:
            return StocktakeSession.objects.filter(store=store)
        return StocktakeSession.objects.none()

    @action(detail=False, methods=['post'])
    def start(self, request):
        user = request.user
        store = getattr(user, 'store', None)
        if not store:
            return Response({"error": "No store associated with user."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Check if there is already a pending session?
        pending = StocktakeSession.objects.filter(store=store, status='PENDING').first()
        if pending:
             return Response(StocktakeSessionSerializer(pending).data)
             
        session = StocktakeSession.objects.create(store=store, user=user, status='PENDING')
        return Response(StocktakeSessionSerializer(session).data)

    @action(detail=True, methods=['post'])
    def save_records(self, request, pk=None):
        session = self.get_object()
        if session.status != 'PENDING':
             return Response({"error": "Session is not pending."}, status=status.HTTP_400_BAD_REQUEST)
             
        items_data = request.data.get('records', [])
        # Format: [{item_id, location_id, quantity_counted, unit_name (opt)}]
        
        created_records = []
        for data in items_data:
            item_id = data.get('item_id')
            location_id = data.get('location_id')
            raw_qty = data.get('quantity_counted')
            unit_name = data.get('unit_name')
            
            if not item_id or not location_id: 
                continue
                
            try:
                qty = float(raw_qty)
            except (ValueError, TypeError):
                continue

            # Convert to base unit if needed
            if unit_name:
                try:
                     item = Item.objects.get(id=item_id)
                     if unit_name != item.base_unit:
                         conv = UnitConversion.objects.filter(item=item, unit_name=unit_name).first()
                         if conv:
                             qty = qty * conv.factor
                except Item.DoesNotExist:
                     continue
            
            # Update or Create record for this session/item/location
            record, created = StocktakeRecord.objects.update_or_create(
                session=session,
                item_id=item_id,
                location_id=location_id,
                defaults={'quantity_counted': qty}
            )
            created_records.append(record)
            
        return Response({"message": "Records saved.", "count": len(created_records)})

    @action(detail=True, methods=['post'])
    def finalize(self, request, pk=None):
        session = self.get_object()
        if session.status != 'PENDING':
             return Response({"error": "Session is not pending."}, status=status.HTTP_400_BAD_REQUEST)
             
        report = InventoryService.finalize_stocktake_session(session)
        return Response({"message": "Stocktake finalized.", "report": report})

class ExpiredItemLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ExpiredItemLog.objects.all()
    serializer_class = ExpiredItemLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        store = getattr(user, 'store', None)
        if store:
            return ExpiredItemLog.objects.filter(store=store).order_by('-disposed_at')
        return ExpiredItemLog.objects.none()
