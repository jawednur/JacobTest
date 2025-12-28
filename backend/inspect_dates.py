import os
import django
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ims_mrp.settings')
django.setup()

from inventory.models import Inventory, Item

def inspect_inventory():
    print("Inspecting Inventory Created Dates...")
    items = Item.objects.all()
    for item in items:
        invs = Inventory.objects.filter(item=item)
        if invs.exists():
            print(f"Item: {item.name}")
            for inv in invs:
                print(f"  - Loc: {inv.location.name}, Qty: {inv.quantity}")
                print(f"    Created: {inv.created_at}")
                print(f"    Expires: {inv.expiration_date}")
                
                # Check if created_at is today (approx)
                if inv.created_at:
                    age = timezone.now() - inv.created_at
                    print(f"    Age: {age}")
                else:
                    print("    Age: NULL")

if __name__ == "__main__":
    inspect_inventory()

