import os
import django
import random
from datetime import timedelta
from django.utils import timezone

# Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ims_mrp.settings')
django.setup()

from users.models import Store, CustomUser
from inventory.models import Item, Inventory, Location, UnitConversion, Recipe, RecipeIngredient, ProductionLog, DailyUsage

def create_mock_data():
    print("Creating mock data...")

    # 1. Ensure Store Exists (Prioritize 'Jacob\'s Bakery' for existing admin user)
    store = Store.objects.filter(name="Jacob's Bakery").first()
    if not store:
        store, _ = Store.objects.get_or_create(name="Downtown Store")
    
    print(f"Using Store: {store.name} (ID: {store.id})")
    
    # 2. Ensure User Exists
    user = CustomUser.objects.filter(username="admin").first()
    if not user:
        user, _ = CustomUser.objects.get_or_create(
            username="admin",
            defaults={
                'email': "admin@example.com", 
                'role': "admin",
                'store': store
            }
        )
    # Ensure admin is linked to this store for testing
    if user.store != store:
        print(f"Updating user {user.username} store from {user.store} to {store.name}")
        user.store = store
        user.save()

    if not user.check_password("admin"):
        user.set_password("admin")
        user.save()

    # 3. Create Locations
    kitchen, _ = Location.objects.get_or_create(store=store, name="Kitchen")
    pantry, _ = Location.objects.get_or_create(store=store, name="Pantry")
    display, _ = Location.objects.get_or_create(store=store, name="Display Case", defaults={'is_sales_floor': True})

    # 4. Create Items (Ingredients)
    flour, _ = Item.objects.get_or_create(
        name="Flour", 
        defaults={'type': 'ingredient', 'base_unit': 'Gram', 'store': store}
    )
    sugar, _ = Item.objects.get_or_create(
        name="Sugar", 
        defaults={'type': 'ingredient', 'base_unit': 'Gram', 'store': store}
    )
    eggs, _ = Item.objects.get_or_create(
        name="Eggs", 
        defaults={'type': 'ingredient', 'base_unit': 'Single', 'store': store}
    )
    butter, _ = Item.objects.get_or_create(
        name="Butter", 
        defaults={'type': 'ingredient', 'base_unit': 'Gram', 'store': store}
    )
    chocolate, _ = Item.objects.get_or_create(
        name="Chocolate Chips", 
        defaults={'type': 'ingredient', 'base_unit': 'Gram', 'store': store}
    )

    # 5. Create Unit Conversions
    UnitConversion.objects.get_or_create(item=flour, unit_name="Kg", defaults={'factor': 1000})
    UnitConversion.objects.get_or_create(item=sugar, unit_name="Kg", defaults={'factor': 1000})
    UnitConversion.objects.get_or_create(item=butter, unit_name="Block (250g)", defaults={'factor': 250})

    # 6. Create Products (Recipes)
    croissant, _ = Item.objects.get_or_create(
        name="Croissant", 
        defaults={'type': 'product', 'base_unit': 'Single', 'store': store, 'shelf_life_days': 1}
    )
    muffin, _ = Item.objects.get_or_create(
        name="Chocolate Muffin", 
        defaults={'type': 'product', 'base_unit': 'Single', 'store': store, 'shelf_life_days': 2}
    )
    cake, _ = Item.objects.get_or_create(
        name="Victoria Sponge", 
        defaults={'type': 'product', 'base_unit': 'Slice', 'store': store, 'shelf_life_days': 3}
    )

    # 7. Create Recipes
    # Croissant Recipe
    r_croissant, _ = Recipe.objects.get_or_create(item=croissant, defaults={'yield_quantity': 12})
    RecipeIngredient.objects.get_or_create(recipe=r_croissant, ingredient_item=flour, defaults={'quantity_required': 500})
    RecipeIngredient.objects.get_or_create(recipe=r_croissant, ingredient_item=butter, defaults={'quantity_required': 250})
    
    # Muffin Recipe
    r_muffin, _ = Recipe.objects.get_or_create(item=muffin, defaults={'yield_quantity': 6})
    RecipeIngredient.objects.get_or_create(recipe=r_muffin, ingredient_item=flour, defaults={'quantity_required': 300})
    RecipeIngredient.objects.get_or_create(recipe=r_muffin, ingredient_item=sugar, defaults={'quantity_required': 150})
    RecipeIngredient.objects.get_or_create(recipe=r_muffin, ingredient_item=chocolate, defaults={'quantity_required': 100})
    RecipeIngredient.objects.get_or_create(recipe=r_muffin, ingredient_item=eggs, defaults={'quantity_required': 2})

    # Cake Recipe
    r_cake, _ = Recipe.objects.get_or_create(item=cake, defaults={'yield_quantity': 8})
    RecipeIngredient.objects.get_or_create(recipe=r_cake, ingredient_item=flour, defaults={'quantity_required': 400})
    RecipeIngredient.objects.get_or_create(recipe=r_cake, ingredient_item=sugar, defaults={'quantity_required': 400})
    RecipeIngredient.objects.get_or_create(recipe=r_cake, ingredient_item=butter, defaults={'quantity_required': 400})
    RecipeIngredient.objects.get_or_create(recipe=r_cake, ingredient_item=eggs, defaults={'quantity_required': 4})


    # 8. Create Inventory (Ingredients)
    Inventory.objects.get_or_create(store=store, item=flour, location=pantry, defaults={'quantity': 5000}) # 5kg
    Inventory.objects.get_or_create(store=store, item=sugar, location=pantry, defaults={'quantity': 2000}) # 2kg
    Inventory.objects.get_or_create(store=store, item=butter, location=kitchen, defaults={'quantity': 1000}) # 4 blocks
    Inventory.objects.get_or_create(store=store, item=eggs, location=kitchen, defaults={'quantity': 60}) # 5 dozen

    # 9. Create Inventory (Finished Products - Current Stock)
    # 24 Croissants
    Inventory.objects.get_or_create(store=store, item=croissant, location=display, defaults={'quantity': 24})
    # 12 Muffins
    Inventory.objects.get_or_create(store=store, item=muffin, location=display, defaults={'quantity': 12})
    # 0 Cake (Sold out)

    # 10. Generate Production Logs & Simulated Daily Sales (Past 30 Days)
    today = timezone.now().date()
    
    # Clear old logs
    ProductionLog.objects.all().delete() 
    DailyUsage.objects.all().delete()

    print("Generating logs and sales history...")
    for i in range(30):
        date = today - timedelta(days=29-i) # Start 30 days ago, go forward
        
        # --- Simulate Production ---
        # Make Croissants every day
        qty_made = random.choice([24, 36, 48])
        log = ProductionLog.objects.create(
            store=store, user=user, recipe=r_croissant, 
            quantity_made=qty_made, unit_type='Single', target_location=display
        )
        log.timestamp = date
        log.save()
        total_croissant_made = qty_made

        # Make Muffins every other day
        total_muffin_made = 0
        if i % 2 == 0:
            qty_made = random.choice([12, 24, 36])
            log = ProductionLog.objects.create(
                store=store, user=user, recipe=r_muffin, 
                quantity_made=qty_made, unit_type='Single', target_location=display
            )
            log.timestamp = date
            log.save()
            total_muffin_made = qty_made
            
        # Make Cake on weekends (approx)
        total_cake_made = 0
        if i % 7 in [0, 6]:
            qty_made = 8 # 1 cake = 8 slices
            log = ProductionLog.objects.create(
                store=store, user=user, recipe=r_cake, 
                quantity_made=qty_made, unit_type='Slice', target_location=display
            )
            log.timestamp = date
            log.save()
            total_cake_made = qty_made

        # --- Simulate Sales (DailyUsage) ---
        # Assuming we start with 0, made X, and ended with Y.
        # Sold = Start + Made - End
        # Let's say we sell 80-90% of what we made that day (simplified)
        
        # Croissants
        sold_croissant = int(total_croissant_made * random.uniform(0.7, 0.95))
        DailyUsage.objects.create(
            store=store, item=croissant, date=date,
            starting_count=0, made_count=total_croissant_made, received_count=0,
            ending_count=total_croissant_made - sold_croissant,
            implied_consumption=sold_croissant
        )

        # Muffins
        if total_muffin_made > 0:
            sold_muffin = int(total_muffin_made * random.uniform(0.6, 0.9))
            DailyUsage.objects.create(
                store=store, item=muffin, date=date,
                starting_count=0, made_count=total_muffin_made, received_count=0,
                ending_count=total_muffin_made - sold_muffin,
                implied_consumption=sold_muffin
            )
        
        # Cake
        if total_cake_made > 0:
            sold_cake = int(total_cake_made * random.uniform(0.8, 1.0))
            DailyUsage.objects.create(
                store=store, item=cake, date=date,
                starting_count=0, made_count=total_cake_made, received_count=0,
                ending_count=total_cake_made - sold_cake,
                implied_consumption=sold_cake
            )

    print("Mock data created successfully!")

if __name__ == "__main__":
    create_mock_data()
