import os
import django
from django.utils import timezone
from datetime import timedelta

# Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ims_mrp.settings')
django.setup()

from inventory.models import DailyUsage, ProductionLog
from users.models import CustomUser, Store

def inspect_data():
    print(f"Timezone: {timezone.get_current_timezone_name()}")
    print(f"Now: {timezone.now()}")
    
    store_count = Store.objects.count()
    print(f"Stores: {store_count}")
    for s in Store.objects.all():
        print(f" - {s.name} (ID: {s.id})")

    user_count = CustomUser.objects.count()
    print(f"Users: {user_count}")
    for u in CustomUser.objects.all():
        print(f" - {u.username} (Role: {u.role}, Store: {u.store})")

    usage_count = DailyUsage.objects.count()
    print(f"DailyUsage Records: {usage_count}")
    
    if usage_count > 0:
        last_usage = DailyUsage.objects.order_by('-date').first()
        first_usage = DailyUsage.objects.order_by('date').first()
        print(f" - Date Range: {first_usage.date} to {last_usage.date}")
        
        # Check specific filter used in view
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)
        print(f" - View Filter Start Date: {start_date}")
        
        recent_usage = DailyUsage.objects.filter(date__gte=start_date)
        print(f" - Records in last 30 days: {recent_usage.count()}")
        
        if recent_usage.exists():
            u = recent_usage.first()
            print(f" - Sample Record: {u.item.name} on {u.date} (Consumption: {u.implied_consumption}, Store: {u.store.name})")
    
    prod_count = ProductionLog.objects.count()
    print(f"Production Logs: {prod_count}")

if __name__ == "__main__":
    inspect_data()

