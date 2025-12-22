import os
import django
from django.utils import timezone
from datetime import timedelta
import random

# Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ims_mrp.settings')
django.setup()

from users.models import CustomUser, Store
from inventory.models import Location, Item, UnitConversion, Recipe, RecipeStep, RecipeStepIngredient, Inventory, ProductionLog, RecipeIngredient

def create_mock_data():
    print("Creating Mock Data...")

    # 1. Create Store
    store, created = Store.objects.get_or_create(name="Jacob's Bakery", address="123 Dough St.")
    print(f"Store: {store.name}")

    # 2. Create Users
    admin_user, _ = CustomUser.objects.get_or_create(username="admin", defaults={
        'email': 'admin@example.com', 
        'role': 'admin', 
        'store': store,
        'is_staff': True,
        'is_superuser': True
    })
    if not admin_user.check_password('admin'):
        admin_user.set_password('admin')
        admin_user.save()
    
    employee_user, _ = CustomUser.objects.get_or_create(username="chef", defaults={'email': 'chef@example.com', 'role': 'employee', 'store': store})
    if not employee_user.check_password('chef'):
        employee_user.set_password('chef')
        employee_user.save()
    print("Users created: admin/admin, chef/chef")

    # 3. Create Locations
    loc_pantry, _ = Location.objects.get_or_create(store=store, name="Dry Pantry")
    loc_fridge, _ = Location.objects.get_or_create(store=store, name="Walk-in Fridge")
    loc_freezer, _ = Location.objects.get_or_create(store=store, name="Freezer")
    loc_display, _ = Location.objects.get_or_create(store=store, name="Front Display", is_sales_floor=True)
    print("Locations created.")

    # 4. Create Items (Ingredients)
    flour, _ = Item.objects.get_or_create(name="All Purpose Flour", type="ingredient", defaults={'base_unit': 'g', 'shelf_life_days': 180})
    sugar, _ = Item.objects.get_or_create(name="Sugar", type="ingredient", defaults={'base_unit': 'g', 'shelf_life_days': 365})
    eggs, _ = Item.objects.get_or_create(name="Eggs", type="ingredient", defaults={'base_unit': 'single', 'shelf_life_days': 21})
    butter, _ = Item.objects.get_or_create(name="Butter", type="ingredient", defaults={'base_unit': 'g', 'shelf_life_days': 60})
    choco_chips, _ = Item.objects.get_or_create(name="Chocolate Chips", type="ingredient", defaults={'base_unit': 'g', 'shelf_life_days': 365})
    vanilla, _ = Item.objects.get_or_create(name="Vanilla Extract", type="ingredient", defaults={'base_unit': 'ml', 'shelf_life_days': 730})
    frozen_avocados, _ = Item.objects.get_or_create(name="Frozen Avocados", type="ingredient", defaults={'base_unit': 'bag', 'shelf_life_days': None}) # No Expiration

    # 5. Create Items (Products)
    cookies, _ = Item.objects.get_or_create(name="Chocolate Chip Cookies", type="product", defaults={'base_unit': 'cookie', 'shelf_life_days': 3})
    croissant, _ = Item.objects.get_or_create(name="Croissant", type="product", defaults={'base_unit': 'single', 'shelf_life_days': 1})
    
    print("Items created.")

    # 6. Unit Conversions
    # Flour: 1 Cup = 120g
    UnitConversion.objects.get_or_create(item=flour, unit_name="cup", defaults={'factor': 120})
    # Sugar: 1 Cup = 200g
    UnitConversion.objects.get_or_create(item=sugar, unit_name="cup", defaults={'factor': 200})
    # Butter: 1 Stick = 113g
    UnitConversion.objects.get_or_create(item=butter, unit_name="stick", defaults={'factor': 113})
    # Batch units
    UnitConversion.objects.get_or_create(item=cookies, unit_name="dozen", defaults={'factor': 12})

    print("Unit Conversions created.")

    # 7. Create Recipe (Chocolate Chip Cookies)
    cookie_recipe, _ = Recipe.objects.get_or_create(
        item=cookies, 
        defaults={
            'yield_quantity': 24, # Yields 24 cookies (2 dozen)
            'instructions': "Mix ingredients and bake." # Deprecated field
        }
    )

    # Recipe Ingredients (for backend calculation)
    # 2.5 cups flour -> 300g
    RecipeIngredient.objects.get_or_create(recipe=cookie_recipe, ingredient_item=flour, defaults={'quantity_required': 300})
    # 1 cup butter -> 226g
    RecipeIngredient.objects.get_or_create(recipe=cookie_recipe, ingredient_item=butter, defaults={'quantity_required': 226})
    # 1 cup sugar -> 200g
    RecipeIngredient.objects.get_or_create(recipe=cookie_recipe, ingredient_item=sugar, defaults={'quantity_required': 200})
    # 2 eggs
    RecipeIngredient.objects.get_or_create(recipe=cookie_recipe, ingredient_item=eggs, defaults={'quantity_required': 2})
    # 2 cups choco chips -> 340g (approx)
    RecipeIngredient.objects.get_or_create(recipe=cookie_recipe, ingredient_item=choco_chips, defaults={'quantity_required': 340})

    # Recipe Steps (Detailed)
    if cookie_recipe.steps.count() == 0:
        s1 = RecipeStep.objects.create(
            recipe=cookie_recipe, 
            step_number=1, 
            instruction="Cream together the butter and sugar until smooth.",
            caption="Creaming butter"
        )
        RecipeStepIngredient.objects.create(step=s1, ingredient=butter, quantity="2 sticks (226g)")
        RecipeStepIngredient.objects.create(step=s1, ingredient=sugar, quantity="1 cup (200g)")

        s2 = RecipeStep.objects.create(
            recipe=cookie_recipe, 
            step_number=2, 
            instruction="Beat in the eggs one at a time, then stir in the vanilla."
        )
        RecipeStepIngredient.objects.create(step=s2, ingredient=eggs, quantity="2 large")
        RecipeStepIngredient.objects.create(step=s2, ingredient=vanilla, quantity="2 tsp")

        s3 = RecipeStep.objects.create(
            recipe=cookie_recipe, 
            step_number=3, 
            instruction="Dissolve baking soda in hot water. Add to batter along with salt. Stir in flour and chocolate chips."
        )
        RecipeStepIngredient.objects.create(step=s3, ingredient=flour, quantity="2.5 cups (300g)")
        RecipeStepIngredient.objects.create(step=s3, ingredient=choco_chips, quantity="2 cups (340g)")

        s4 = RecipeStep.objects.create(
            recipe=cookie_recipe, 
            step_number=4, 
            instruction="Drop by large spoonfuls onto ungreased pans. Bake for about 10 minutes in the preheated oven, or until edges are nicely browned."
        )

    # Expiring Today (Milk - let's create milk first)
    milk, _ = Item.objects.get_or_create(name="Whole Milk", type="ingredient", defaults={'base_unit': 'L', 'shelf_life_days': 14})
    
    # 7b. Create Recipe (Croissants) - FIX: Added actual ingredients for Croissants so it doesn't show Cookie ingredients!
    croissant_recipe, _ = Recipe.objects.get_or_create(
        item=croissant, 
        defaults={
            'yield_quantity': 12, # Yields 12 croissants
            'instructions': "Laminate dough and bake."
        }
    )
    
    # Recipe Ingredients for Croissants
    # 500g Flour
    RecipeIngredient.objects.get_or_create(recipe=croissant_recipe, ingredient_item=flour, defaults={'quantity_required': 500})
    # 250g Butter (for lamination)
    RecipeIngredient.objects.get_or_create(recipe=croissant_recipe, ingredient_item=butter, defaults={'quantity_required': 250})
    # 50g Sugar
    RecipeIngredient.objects.get_or_create(recipe=croissant_recipe, ingredient_item=sugar, defaults={'quantity_required': 50})
    # 1 Egg (wash)
    RecipeIngredient.objects.get_or_create(recipe=croissant_recipe, ingredient_item=eggs, defaults={'quantity_required': 1})
    # Milk
    RecipeIngredient.objects.get_or_create(recipe=croissant_recipe, ingredient_item=milk, defaults={'quantity_required': 0.3}) # 300ml

    # Recipe Steps for Croissants
    if croissant_recipe.steps.count() == 0:
        c1 = RecipeStep.objects.create(
            recipe=croissant_recipe, 
            step_number=1, 
            instruction="Mix flour, sugar, milk to form dough. Chill."
        )
        RecipeStepIngredient.objects.create(step=c1, ingredient=flour, quantity="500g")
        RecipeStepIngredient.objects.create(step=c1, ingredient=sugar, quantity="50g")
        RecipeStepIngredient.objects.create(step=c1, ingredient=milk, quantity="300ml")

        c2 = RecipeStep.objects.create(
            recipe=croissant_recipe, 
            step_number=2, 
            instruction="Laminate the dough with butter block. Fold and turn 3 times."
        )
        RecipeStepIngredient.objects.create(step=c2, ingredient=butter, quantity="250g")

        c3 = RecipeStep.objects.create(
            recipe=croissant_recipe, 
            step_number=3, 
            instruction="Shape into triangles and roll. Proof until jiggly. Egg wash and bake."
        )
        RecipeStepIngredient.objects.create(step=c3, ingredient=eggs, quantity="1 for wash")

    # 8. Inventory
    # Good Inventory
    Inventory.objects.get_or_create(store=store, item=flour, location=loc_pantry, defaults={'quantity': 5000, 'expiration_date': timezone.now() + timedelta(days=100)})
    Inventory.objects.get_or_create(store=store, item=sugar, location=loc_pantry, defaults={'quantity': 5000, 'expiration_date': timezone.now() + timedelta(days=200)})
    Inventory.objects.get_or_create(store=store, item=butter, location=loc_fridge, defaults={'quantity': 1000, 'expiration_date': timezone.now() + timedelta(days=30)})
    Inventory.objects.get_or_create(store=store, item=eggs, location=loc_fridge, defaults={'quantity': 100, 'expiration_date': timezone.now() + timedelta(days=10)})
    Inventory.objects.get_or_create(store=store, item=choco_chips, location=loc_pantry, defaults={'quantity': 2000, 'expiration_date': timezone.now() + timedelta(days=150)})
    
    # Frozen Avocados (No Expiry)
    Inventory.objects.get_or_create(store=store, item=frozen_avocados, location=loc_freezer, defaults={'quantity': 10, 'expiration_date': None})

    # Milk Inventory
    Inventory.objects.create(store=store, item=milk, location=loc_fridge, quantity=2, expiration_date=timezone.now()) # Expiring TODAY

    # Expired Item (Old Cream)
    cream, _ = Item.objects.get_or_create(name="Heavy Cream", type="ingredient", defaults={'base_unit': 'L', 'shelf_life_days': 14})
    Inventory.objects.create(store=store, item=cream, location=loc_fridge, quantity=1, expiration_date=timezone.now() - timedelta(days=5)) # Expired 5 days ago

    # Low Stock Item
    salt, _ = Item.objects.get_or_create(name="Salt", type="ingredient", defaults={'base_unit': 'g', 'shelf_life_days': 365})
    Inventory.objects.get_or_create(store=store, item=salt, location=loc_pantry, defaults={'quantity': 5}) # Low stock (<10)

    print("Inventory populated.")

    print("Done! Mock data created successfully.")

if __name__ == '__main__':
    create_mock_data()

