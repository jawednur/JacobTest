from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Store

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('role', 'store')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('role', 'store')}),
    )
    list_display = UserAdmin.list_display + ('role', 'store')
    list_filter = UserAdmin.list_filter + ('role', 'store')

@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ('name', 'address')
