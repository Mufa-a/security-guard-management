from .models import IPLockout, CURRENT_POLICY_VERSION
from .utils import get_client_ip
from .throttles import LoginRateThrottle, PasswordResetRateThrottle
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.middleware.csrf import get_token as get_csrf_token
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import generics, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework import generics
from apps.core.permissions import IsManagerOrAdmin
from datetime import timedelta
from django.utils import timezone
from .serializers import PinLoginSerializer


def set_auth_cookies(response, access_token, refresh_token=None):
    """Attach the JWTs as httpOnly cookies. Never exposed to JS."""
    cookie_kwargs = dict(
        httponly=True,
        secure=not settings.DEBUG,
        samesite='None' if not settings.DEBUG else 'Lax',
    )
    response.set_cookie(
        'access_token',
        access_token,
        max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
        path='/',
        **cookie_kwargs,
    )
    if refresh_token is not None:
        response.set_cookie(
            'refresh_token',
            refresh_token,
            max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
            path='/api/accounts/',
            **cookie_kwargs,
        )


def clear_auth_cookies(response):
    response.delete_cookie('access_token', path='/')
    response.delete_cookie('refresh_token', path='/api/accounts/')



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
    throttle_classes = [LoginRateThrottle]
    throttle_scope = 'login'

    def post(self, request, *args, **kwargs):
        ip = get_client_ip(request)
        lockout, _ = IPLockout.objects.get_or_create(ip_address=ip)

        if lockout.is_locked():
            return Response(
                {
                    'detail': 'Too many failed login attempts from this location. Try again later.',
                    'locked_until': lockout.locked_until.isoformat(),
                },
                status=status.HTTP_423_LOCKED,
            )

        email = request.data.get('email')
        user = User.objects.filter(email=email).first() if email else None

        if user and user.is_password_locked():
            lockout.register_failure()
            return Response(
                {
                    'detail': 'This account is temporarily locked due to too many failed login attempts.',
                    'locked_until': user.password_locked_until.isoformat(),
                },
                status=status.HTTP_423_LOCKED,
            )

        try:
            response = super().post(request, *args, **kwargs)
        except (serializers.ValidationError,) as exc:
            lockout.register_failure()
            if user:
                user.register_password_failure()
            raise exc

        # Only reached if no exception was raised, i.e. success.
        lockout.register_success()
        if user:
            user.register_password_success()

        access = response.data.pop('access', None)
        refresh = response.data.pop('refresh', None)
        set_auth_cookies(response, access, refresh)
        get_csrf_token(request)  # ensures the readable csrftoken cookie is issued

        return response


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetRateThrottle]
    throttle_scope = 'password_reset'

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email=serializer.validated_data["email"]).first()

        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = PasswordResetTokenGenerator().make_token(user)
            reset_link = f"http://localhost:5173/reset-password?uid={uid}&token={token}"

            send_mail(
                subject="Password Reset — Security Guard Management",
                message=f"Reset your password: {reset_link}",
                from_email=None,
                recipient_list=[user.email],
            )

        # Same response whether or not the email exists, to avoid leaking
        # which addresses are registered.
        return Response(
            {"detail": "If that email exists, a reset link has been sent."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetRateThrottle]
    throttle_scope = 'password_reset'

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


class AcceptPolicyView(APIView):
    """
    Authenticated endpoint hit from AcceptPolicyPage on first login.
    Always stamps the *current* version — this is what makes future
    policy updates re-trigger the block automatically.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        user.policy_accepted_at = timezone.now()
        user.policy_version = CURRENT_POLICY_VERSION
        user.save(update_fields=["policy_accepted_at", "policy_version"])
        return Response({"policy_accepted": True})


class PinLoginView(APIView):
    """
    Guard-specific login: employee_number + PIN instead of email + password.
    Enforces both a per-guard PIN lockout (5 attempts, 15 min) and a
    per-IP lockout (10 attempts, 30 min) across all failure reasons.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        ip = get_client_ip(request)
        ip_lockout, _ = IPLockout.objects.get_or_create(ip_address=ip)

        if ip_lockout.is_locked():
            return Response(
                {
                    'detail': 'Too many failed login attempts from this location. Try again later.',
                    'locked_until': ip_lockout.locked_until.isoformat(),
                },
                status=status.HTTP_423_LOCKED,
            )

        serializer = PinLoginSerializer(data=request.data)
        if not serializer.is_valid():
            ip_lockout.register_failure()
            raise serializers.ValidationError(serializer.errors)

        employee_number = serializer.validated_data['employee_number']
        pin = serializer.validated_data['pin']

        from apps.staff.models import EmployeeProfile
        try:
            employee = EmployeeProfile.objects.select_related('user').get(
                employee_number=employee_number
            )
        except EmployeeProfile.DoesNotExist:
            ip_lockout.register_failure()
            return Response({'detail': 'Invalid employee number or PIN.'}, status=status.HTTP_400_BAD_REQUEST)

        if employee.is_pin_locked():
            ip_lockout.register_failure()
            return Response(
                {
                    'detail': 'Too many failed attempts. Try again in a few minutes.',
                    'locked_until': employee.pin_locked_until.isoformat(),
                },
                status=status.HTTP_423_LOCKED,
            )

        if not employee.user.is_active:
            ip_lockout.register_failure()
            return Response({'detail': 'This account is inactive.'}, status=status.HTTP_403_FORBIDDEN)

        if not employee.user.role or employee.user.role.name != 'GUARD':
            ip_lockout.register_failure()
            return Response(
                {'detail': 'PIN login is only available for guards.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not employee.check_pin(pin):
            ip_lockout.register_failure()
            employee.pin_attempts += 1
            if employee.pin_attempts >= 5:
                employee.pin_locked_until = timezone.now() + timedelta(minutes=15)
            employee.save(update_fields=['pin_attempts', 'pin_locked_until'])
            return Response({'detail': 'Invalid employee number or PIN.'}, status=status.HTTP_400_BAD_REQUEST)

        employee.pin_attempts = 0
        employee.pin_locked_until = None
        employee.save(update_fields=['pin_attempts', 'pin_locked_until'])

        ip_lockout.register_success()

        token = CustomTokenObtainPairSerializer.get_token(employee.user)
        response = Response({
            'pin_must_change': employee.pin_must_change,
            'policy_accepted': employee.user.policy_version == CURRENT_POLICY_VERSION,
        })
        set_auth_cookies(response, str(token.access_token), str(token))
        get_csrf_token(request)
        return response


class CookieTokenRefreshView(TokenRefreshView):
    """
    Reads the refresh token from the httpOnly cookie (never from the
    request body) and issues new httpOnly cookies for the rotated pair.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get('refresh_token')
        if not refresh_token:
            return Response({'detail': 'Refresh token missing.'}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = self.get_serializer(data={'refresh': refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError:
            response = Response({'detail': 'Refresh token invalid or expired.'}, status=status.HTTP_401_UNAUTHORIZED)
            clear_auth_cookies(response)
            return response

        access = serializer.validated_data.get('access')
        new_refresh = serializer.validated_data.get('refresh')  # present: ROTATE_REFRESH_TOKENS=True

        response = Response({'detail': 'Token refreshed.'})
        set_auth_cookies(response, access, new_refresh)
        return response


class LogoutView(APIView):
    """Blacklists the refresh token (if present/valid) and clears both cookies."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token')
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except TokenError:
                pass  # already invalid/expired — fine, we're logging out anyway

        response = Response({'detail': 'Logged out.'})
        clear_auth_cookies(response)
        return response