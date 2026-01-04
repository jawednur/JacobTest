from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone
from datetime import timedelta
from inventory.models import Inventory, ProductionLog, Recipe, RecipeIngredient, VarianceLog, Item, UnitConversion, Location, ReceivingLog, StocktakeSession, StocktakeRecord

class InventoryService:
    @staticmethod
    def process_receiving_log(receiving_log: ReceivingLog):
        """
        Updates inventory when items are received.
        Creates a NEW batch (Inventory record) to preserve expiration dates.
        """
        store = receiving_log.store
        item = receiving_log.item
        quantity = receiving_log.quantity
        
        # Find default location
        location = None
        if hasattr(item, 'store_settings'):
            settings = item.store_settings.filter(store=store).first()
            if settings:
                location = settings.default_location
        
        if not location:
            location = Location.objects.filter(store=store, is_sales_floor=False).first()
        
        if not location:
            location = Location.objects.filter(store=store).first()
            
        if not location:
            location = Location.objects.create(store=store, name="Back of House")

        # Create NEW Inventory Batch
        # We try to match an existing batch with the SAME expiration date (to avoid fragmentation)
        # OR create new if none exists.
        
        expiration_date = None
        if item.shelf_life_days is not None:
             expiration_date = timezone.now() + timedelta(days=item.shelf_life_days)

        # Look for existing batch with approximate expiration (same day)
        # Since expiration_date is DateTime, we need to be careful.
        # Ideally we'd strip time or use a small window, but for now exact match or new is safer for FIFO.
        # To avoid infinite rows, let's try to match strict date if possible or just create new.
        # Given the requirements, creating new is safest to guarantee we don't mix old/new.
        # However, to prevent database explosion, maybe we check if there is a batch created "today"?
        # For now, let's just Create New or Update EXACT Match.
        
        inventory = None
        if expiration_date:
            # Try to find one with very close expiration (e.g. created today/same expiry)
            # This is tricky with exact timestamps.
            # Simplified approach: Create new record.
            pass
        
        # Actually, let's try to reuse if it has NO expiration date and we are adding one?
        # No, "Receiving" implies new stock. New stock = New Expiration.
        
        inventory = Inventory.objects.create(
            store=store,
            item=item,
            location=location,
            quantity=quantity,
            expiration_date=expiration_date
        )

    @staticmethod
    def finalize_stocktake_session(session: StocktakeSession):
        """
        Finalizes a stocktake session.
        Calculates variances and updates inventory.
        Returns a report of usage and variance.
        """
        if session.status == 'COMPLETED':
             return None # Already processed

        store = session.store
        records = session.records.all()
        
        report_data = []
        
        with transaction.atomic():
            # Get all items counted
            counted_items = set(records.values_list('item_id', flat=True))
            
            # Find previous session for usage calc
            last_session = StocktakeSession.objects.filter(
                store=store, 
                status='COMPLETED', 
                completed_at__lt=session.started_at
            ).order_by('-completed_at').first()
            
            start_date = last_session.completed_at if last_session else None
            
            for item_id in counted_items:
                item = Item.objects.get(id=item_id)
                
                # Get total counted for this item (could be across multiple locations)
                item_records = records.filter(item_id=item_id)
                
                total_counted = item_records.aggregate(Sum('quantity_counted'))['quantity_counted__sum'] or 0.0
                
                # Current System Quantity (Expected)
                current_inventory = Inventory.objects.filter(store=store, item_id=item_id).aggregate(Sum('quantity'))['quantity__sum'] or 0.0
                
                variance = total_counted - current_inventory
                
                # Usage Calculation
                start_qty = 0.0
                if last_session:
                    last_records = StocktakeRecord.objects.filter(session=last_session, item_id=item_id)
                    start_qty = last_records.aggregate(Sum('quantity_counted'))['quantity_counted__sum'] or 0.0
                
                received_qty = 0.0
                # Received Logic
                recv_query = ReceivingLog.objects.filter(store=store, item_id=item_id, timestamp__lte=session.started_at)
                if start_date:
                    recv_query = recv_query.filter(timestamp__gte=start_date)
                
                received_qty = recv_query.aggregate(Sum('quantity'))['quantity__sum'] or 0.0
                    
                actual_usage = start_qty + received_qty - total_counted
                
                # Theoretical Usage (from Prep Logs)
                theoretical_usage = 0.0
                
                # Find recipes that use this item as ingredient
                usage_recipes = RecipeIngredient.objects.filter(ingredient_item=item).select_related('recipe')
                
                # We need ProductionLogs in the period
                logs_query = ProductionLog.objects.filter(store=store, timestamp__lte=session.started_at)
                if start_date:
                    logs_query = logs_query.filter(timestamp__gte=start_date)
                
                for ri in usage_recipes:
                    recipe = ri.recipe
                    # Find logs for this recipe
                    recipe_logs = logs_query.filter(recipe=recipe)
                    
                    for log in recipe_logs:
                         # Calculate batches
                         batches = 0.0
                         recipe_yield_unit_name = recipe.yield_unit.unit_name if recipe.yield_unit else recipe.item.base_unit
                         if log.unit_type.lower() in ['batch', 'batches']:
                             batches = log.quantity_made
                         elif log.unit_type == recipe_yield_unit_name:
                             batches = log.quantity_made / recipe.yield_quantity
                         else:
                             # Try conversion
                             # Simplification for report: 
                             batches = log.quantity_made / recipe.yield_quantity 
                         
                         theoretical_usage += batches * ri.quantity_required
                
                # Report Data Construction
                if session.type == 'ADDITION':
                    # For addition, we just show what was added
                    report_data.append({
                        'item_id': item_id,
                        'item_name': item.name,
                        'start_quantity': current_inventory,
                        'system_quantity': current_inventory,  # Explicit expected qty before addition
                        'received_quantity': total_counted,  # effectively "received" in this session
                        'end_quantity': current_inventory + total_counted,
                        'actual_usage': 0,  # Not calculating usage for addition session
                        'theoretical_usage': 0,
                        'variance': 0,
                        'unit': item.base_unit
                    })
                else:
                    # FULL stocktake: include system quantity (expected before reconciliation)
                    report_data.append({
                        'item_id': item_id,
                        'item_name': item.name,
                        'start_quantity': start_qty,
                        'system_quantity': current_inventory,
                        'received_quantity': received_qty,
                        'end_quantity': total_counted,
                        'actual_usage': actual_usage,
                        'theoretical_usage': theoretical_usage,
                        'variance': variance,
                        'unit': item.base_unit
                    })

                # Update Inventory to match Count (or Add)
                
                # Update Inventory to match Count (or Add)
                
                for record in item_records:
                    if session.type == 'ADDITION':
                        # For Addition, we just add a NEW batch with "fresh" expiration (or none)
                        # We don't mess with existing batches
                        expiration_date = None
                        if item.shelf_life_days is not None:
                             expiration_date = timezone.now() + timedelta(days=item.shelf_life_days)
                        
                        Inventory.objects.create(
                            store=store,
                            item_id=item_id,
                            location=record.location,
                            quantity=record.quantity_counted,
                            expiration_date=expiration_date
                        )
                    else:
                        # FULL Stocktake: FIFO Reconciliation
                        # We have total_counted. We want to keep batches that sum up to this, newest first.
                        
                        target_quantity = record.quantity_counted
                        
                        # Fetch existing batches sorted NEWEST to OLDEST (descending expiration)
                        # Null expiration dates: Assume they are oldest? Or newest?
                        # Usually non-perishables (null exp) don't matter, but if mixed:
                        # Let's assume Null expiration is "Infinite Shelf Life" -> Keep them?
                        # Or assume user wants to keep the valid dated ones?
                        # Let's sort by expiration_date DESC (Newest first). Nulls last?
                        # F(expiration_date).desc(nulls_last=True)
                        
                        # Fetch existing batches sorted NEWEST to OLDEST (descending expiration)
                        # We want to keep:
                        # 1. Items with NO expiration (Infinite shelf life) -> nulls_first=True
                        # 2. Items with Future expiration (Newest)
                        # 3. Items with Past expiration (Oldest)
                        
                        batches = Inventory.objects.filter(
                            store=store, 
                            item_id=item_id, 
                            location=record.location
                        ).order_by(F('expiration_date').desc(nulls_first=True))

                        batches = list(batches)
                        # Wait, standard SQL: NULL < Values.
                        # DESC: Values (Future) -> Values (Past) -> NULL.
                        # Actually we want to keep FUTURE expiration dates.
                        
                        remaining_needed = target_quantity
                        
                        for batch in batches:
                            if remaining_needed <= 0:
                                # We have filled our count, this batch is extra (old/phantom), delete it
                                batch.delete()
                            else:
                                if batch.quantity <= remaining_needed:
                                    # Keep this whole batch
                                    remaining_needed -= batch.quantity
                                    # Batch stays as is (quantity matches)
                                else:
                                    # This batch is partially needed
                                    batch.quantity = remaining_needed
                                    batch.save()
                                    remaining_needed = 0
                        
                        if remaining_needed > 0:
                            # We still need more items than we had on shelf.
                            # Create a NEW batch for the surplus.
                            # Expiration? New/Fresh.
                            expiration_date = None
                            if item.shelf_life_days is not None:
                                 expiration_date = timezone.now() + timedelta(days=item.shelf_life_days)
                            
                            Inventory.objects.create(
                                store=store,
                                item_id=item_id,
                                location=record.location,
                                quantity=remaining_needed,
                                expiration_date=expiration_date
                            )

            session.status = 'COMPLETED'
            session.completed_at = timezone.now()
            session.save()
            
        return report_data

    @staticmethod
    def process_stocktake(store, user, stock_data):
        # Legacy single-shot stocktake
        processed_logs = []
        with transaction.atomic():
            for entry in stock_data:
                item_id = entry.get('item_id')
                location_id = entry.get('location_id')
                
                if not item_id or not location_id:
                    continue

                try:
                    raw_quantity = float(entry.get('actual_quantity', 0))
                except (ValueError, TypeError):
                    raw_quantity = 0.0

                unit_name = entry.get('unit_name')
                actual_quantity_base = raw_quantity
                
                if unit_name:
                    try:
                        item = Item.objects.get(id=item_id)
                        if unit_name != item.base_unit:
                            conversion = UnitConversion.objects.filter(item_id=item_id, unit_name=unit_name).first()
                            if conversion:
                                actual_quantity_base = raw_quantity * conversion.factor
                    except Item.DoesNotExist:
                        continue

                try:
                    inventory = Inventory.objects.get(
                        store=store,
                        item_id=item_id,
                        location_id=location_id
                    )
                    expected_quantity = inventory.quantity
                    
                    # Auto-set expiration if missing and item has shelf life
                    if inventory.expiration_date is None:
                         # Ensure we have the item
                         try:
                             item_obj = Item.objects.get(id=item_id)
                             if item_obj.shelf_life_days is not None:
                                 inventory.expiration_date = timezone.now() + timedelta(days=item_obj.shelf_life_days)
                         except Item.DoesNotExist:
                             pass

                except Inventory.DoesNotExist:
                    expected_quantity = 0.0
                    try:
                        expiration_date = None
                        item = Item.objects.get(id=item_id)
                        if item.shelf_life_days is not None:
                            expiration_date = timezone.now() + timedelta(days=item.shelf_life_days)

                        inventory = Inventory.objects.create(
                            store=store,
                            item_id=item_id,
                            location_id=location_id,
                            quantity=actual_quantity_base,
                            expiration_date=expiration_date
                        )
                    except Exception:
                        continue

                variance = actual_quantity_base - expected_quantity
                
                inventory.quantity = actual_quantity_base
                inventory.save()
                
                if variance != 0:
                    VarianceLog.objects.create(
                        store=store,
                        user=user,
                        item_id=item_id,
                        location_id=location_id,
                        expected_quantity=expected_quantity,
                        actual_quantity=actual_quantity_base,
                        variance=variance
                    )
                    
        return processed_logs

    @staticmethod
    def process_production_log(production_log: ProductionLog, force=False):
        if not production_log.recipe:
            return

        recipe = production_log.recipe
        quantity_made = production_log.quantity_made
        unit_type = production_log.unit_type
        store = production_log.store
        
        batches = 0.0
        # yield_unit is typically the base_unit now, but if set, we respect it
        recipe_yield_unit_name = recipe.yield_unit.unit_name if recipe.yield_unit else recipe.item.base_unit
        
        if unit_type.lower() == 'batch' or unit_type.lower() == 'batches':
             batches = quantity_made
        elif unit_type == recipe_yield_unit_name:
             batches = quantity_made / recipe.yield_quantity
        else:
             try:
                 conversion = UnitConversion.objects.filter(item=recipe.item, unit_name=unit_type).first()
                 if conversion:
                     quantity_in_base = quantity_made * conversion.factor
                     
                     recipe_yield_in_base = recipe.yield_quantity
                     if recipe.yield_unit:
                         recipe_yield_in_base *= recipe.yield_unit.factor
                     
                     if recipe_yield_in_base > 0:
                         batches = quantity_in_base / recipe_yield_in_base
                     else:
                         batches = 0
                 else:
                     batches = quantity_made / recipe.yield_quantity
             except Exception:
                 batches = quantity_made / recipe.yield_quantity

        # Check availability first
        missing_ingredients = []
        if not force:
            for ingredient in recipe.ingredients.all():
                total_ingredient_needed = ingredient.quantity_required * batches
                ingredient_item = ingredient.ingredient_item
                
                total_available = Inventory.objects.filter(
                    store=store, 
                    item=ingredient_item
                ).aggregate(Sum('quantity'))['quantity__sum'] or 0.0
                
                if total_available < total_ingredient_needed:
                    # Calculate display units
                    req_disp_qty, req_disp_unit = ingredient_item.get_display_quantity_and_unit(total_ingredient_needed)
                    avail_disp_qty, avail_disp_unit = ingredient_item.get_display_quantity_and_unit(total_available)
                    
                    missing_ingredients.append({
                        'name': ingredient_item.name,
                        'required': total_ingredient_needed,
                        'available': total_available,
                        'unit': ingredient_item.base_unit,
                        'display_required': round(req_disp_qty, 2),
                        'display_available': round(avail_disp_qty, 2),
                        'display_unit': req_disp_unit # Ideally units match if using same get_display_quantity_and_unit logic
                    })
            
            if missing_ingredients:
                return {'missing_ingredients': missing_ingredients}

        with transaction.atomic():
            for ingredient in recipe.ingredients.all():
                total_ingredient_needed = ingredient.quantity_required * batches
                ingredient_item = ingredient.ingredient_item
                
                inventory_records = Inventory.objects.filter(
                    store=store, 
                    item=ingredient_item
                ).order_by('expiration_date', 'id')
                
                remaining_to_deduct = total_ingredient_needed
                
                for inv in inventory_records:
                    if remaining_to_deduct <= 0:
                        break
                    
                    if inv.quantity >= remaining_to_deduct:
                        inv.quantity = F('quantity') - remaining_to_deduct
                        inv.save()
                        remaining_to_deduct = 0
                    else:
                        deducted = inv.quantity
                        inv.quantity = 0
                        inv.save()
                        remaining_to_deduct -= deducted
                
                if remaining_to_deduct > 0:
                    # Force logic handled here if needed (e.g. tracking negative usage)
                    pass

            if production_log.target_location:
                 produced_item = recipe.item
                 quantity_to_add_base = 0.0
                 recipe_yield_base = recipe.yield_quantity
                 if recipe.yield_unit:
                     recipe_yield_base *= recipe.yield_unit.factor
                 
                 quantity_to_add_base = batches * recipe_yield_base

                 # Create NEW Inventory Batch for Production Output
                 expiration_date = None
                 if produced_item.shelf_life_days is not None:
                      expiration_date = timezone.now() + timedelta(days=produced_item.shelf_life_days)

                 Inventory.objects.create(
                     store=store,
                     item=produced_item,
                     location=production_log.target_location,
                     quantity=quantity_to_add_base,
                     expiration_date=expiration_date
                 )
        
        return None
