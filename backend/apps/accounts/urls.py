from .views import UserListView
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import PinLoginView
from .views import (
    RegisterView,
    CustomTokenObtainPairView,
    MeView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", CustomTokenObtainPairView.as_view(), name="login"),
    path("login/refresh/", TokenRefreshView.as_view(), name="login-refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("users/", UserListView.as_view(), name="user-list"),
    path("pin-login/", PinLoginView.as_view(), name="pin-login"),
]