from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import generics
from apps.core.permissions import IsManagerOrAdmin
from datetime import timedelta
from django.utils import timezone
from .serializers import PinLoginSerializer


from .serializers import (
    RegisterSerializer,
    UserSerializer,
    CustomTokenObtainPairSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)

User = get_user_model()


from apps.core.permissions import IsManagerOrAdmin

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.IsAuthenticated, IsManagerOrAdmin]


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.get(email=serializer.validated_data["email"])

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = PasswordResetTokenGenerator().make_token(user)
        reset_link = f"http://localhost:5173/reset-password?uid={uid}&token={token}"

        send_mail(
            subject="Password Reset — Security Guard Management",
            message=f"Reset your password: {reset_link}",
            from_email=None,
            recipient_list=[user.email],
        )
        return Response({"detail": "Password reset link sent."}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        user.set_password(serializer.validated_data["new_password"])
        user.save()
        return Response({"detail": "Password reset successful."}, status=status.HTTP_200_OK)
    
class UserListView(generics.ListAPIView):
    queryset = User.objects.all().order_by("email")
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsManagerOrAdmin]


class PinLoginView(APIView):
    """
    Guard-specific login: employee_number + PIN instead of email + password.
    Returns the same token shape as normal login, with a 5-attempt lockout.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PinLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        employee_number = serializer.validated_data['employee_number']
        pin = serializer.validated_data['pin']

        from apps.staff.models import EmployeeProfile
        try:
            employee = EmployeeProfile.objects.select_related('user').get(
                employee_number=employee_number
            )
        except EmployeeProfile.DoesNotExist:
            return Response({'detail': 'Invalid employee number or PIN.'}, status=status.HTTP_400_BAD_REQUEST)

        if employee.is_pin_locked():
            return Response(
                {'detail': 'Too many failed attempts. Try again in a few minutes.'},
                status=status.HTTP_423_LOCKED,
            )

        if not employee.user.is_active:
            return Response({'detail': 'This account is inactive.'}, status=status.HTTP_403_FORBIDDEN)

        if not employee.check_pin(pin):
            employee.pin_attempts += 1
            if employee.pin_attempts >= 5:
                employee.pin_locked_until = timezone.now() + timedelta(minutes=15)
            employee.save(update_fields=['pin_attempts', 'pin_locked_until'])
            return Response({'detail': 'Invalid employee number or PIN.'}, status=status.HTTP_400_BAD_REQUEST)

        employee.pin_attempts = 0
        employee.pin_locked_until = None
        employee.save(update_fields=['pin_attempts', 'pin_locked_until'])

        token = CustomTokenObtainPairSerializer.get_token(employee.user)
        return Response({'access': str(token.access_token), 'refresh': str(token)})