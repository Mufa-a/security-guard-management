from rest_framework.permissions import BasePermission
from rest_framework.throttling import ScopedRateThrottle


class HasErpAccess(BasePermission):
    """View-level gate: must be authenticated with a role assigned.
    This is NOT where per-action authorization happens — that's enforced
    independently by every function in tools.py, per-tool, regardless of
    what this permission class allows through."""

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and getattr(request.user, "role", None)
        )


class ErpChatRateThrottle(ScopedRateThrottle):
    scope = "erip_chat"
