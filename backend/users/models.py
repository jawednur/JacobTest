from django.contrib.auth.models import AbstractUser
from django.db import models

class Store(models.Model):
    name = models.CharField(max_length=255)
    address = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('employee', 'Employee'),
        ('it', 'IT Admin'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')
    store = models.ForeignKey(Store, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')

    def __str__(self):
        return self.username
