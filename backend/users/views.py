from rest_framework import generics, permissions, viewsets
from .models import CustomUser, Store
from .serializers import UserProfileSerializer, UserAdminSerializer, StoreSerializer

class IsITAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (getattr(request.user, 'role', '') == 'it' or request.user.is_superuser)

class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    API endpoint for managing user profile.
    """
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint for IT Admins to manage users.
    """
    queryset = CustomUser.objects.all()
    serializer_class = UserAdminSerializer
    permission_classes = [IsITAdmin]

class StoreViewSet(viewsets.ModelViewSet):
    """
    API endpoint for IT Admins to manage stores.
    """
    queryset = Store.objects.all()
    serializer_class = StoreSerializer
    permission_classes = [IsITAdmin]
