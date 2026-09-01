from .views import UserListView
from django.urls import path
from .views import PinLoginView
from .views import AcceptPolicyView
from .views import (
    RegisterView,
    CustomTokenObtainPairView,
    CookieTokenRefreshView,
    LogoutView,
    MeView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", CustomTokenObtainPairView.as_view(), name="login"),
    path("login/refresh/", CookieTokenRefreshView.as_view(), name="login-refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("users/", UserListView.as_view(), name="user-list"),
    path("pin-login/", PinLoginView.as_view(), name="pin-login"),
    path("accept-policy/", AcceptPolicyView.as_view(), name="accept-policy"),
]