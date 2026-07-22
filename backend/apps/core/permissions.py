from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.sites.models import SiteAssignment


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.role and request.user.role.name == "ADMIN")


class IsManagerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.role
            and request.user.role.name in ["ADMIN", "MANAGER"]
        )


class IsSupervisorOrAbove(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.role
            and request.user.role.name in ["ADMIN", "MANAGER", "SUPERVISOR"]
        )
    
class IsManagerOrAdminOrReadOnly(BasePermission):
    """
    SUPERVISOR and above can view (GET/HEAD/OPTIONS).
    Only MANAGER or ADMIN can create/update/delete.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not request.user.role:
            return False
        if request.method in SAFE_METHODS:
            return request.user.role.name in ('SUPERVISOR', 'MANAGER', 'ADMIN')
        return request.user.role.name in ('MANAGER', 'ADMIN')
    
class IsOwnAttendanceOrSupervisor(BasePermission):
    """
    GUARD: can list/retrieve their own record, and use check_in/check_out actions only.
    SUPERVISOR and above: full CRUD on all records.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.role):
            return False
        role_name = request.user.role.name
        if role_name == 'GUARD':
            return view.action in ('list', 'retrieve', 'check_in', 'check_out')
        return role_name in ('ADMIN', 'MANAGER', 'SUPERVISOR')

    def has_object_permission(self, request, view, obj):
        role_name = request.user.role.name
        if role_name in ('ADMIN', 'MANAGER', 'SUPERVISOR'):
            return True
        if role_name == 'GUARD':
            return obj.shift_assignment.employee.user_id == request.user.id
        return False
    
class CanReportIncidentOrSupervisor(BasePermission):
    """
    GUARD: can create incidents and view only their own reports. Cannot edit/delete after submission.
    SUPERVISOR and above: full access to all incidents, including status updates.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.role):
            return False
        role_name = request.user.role.name
        if role_name == 'GUARD':
            return view.action in ('list', 'retrieve', 'create')
        return role_name in ('ADMIN', 'MANAGER', 'SUPERVISOR')

    def has_object_permission(self, request, view, obj):
        role_name = request.user.role.name
        if role_name in ('ADMIN', 'MANAGER', 'SUPERVISOR'):
            return True
        if role_name == 'GUARD':
            # GUARD only reaches here for list/retrieve (create has no object yet,
            # and update/destroy are already blocked in has_permission).
            return obj.reported_by_id == getattr(request.user.employee_profile, 'id', None)
        return False
    
class IsInvoiceManagerOrReadOnly(BasePermission):
    """
    ADMIN (Director) / MANAGER (Secretary): full CRUD.
    SUPERVISOR: read-only.
    GUARD: no access at all.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.role):
            return False
        role_name = request.user.role.name
        if role_name == 'GUARD':
            return False
        if request.method in SAFE_METHODS:
            return role_name in ('ADMIN', 'MANAGER', 'SUPERVISOR')
        return role_name in ('ADMIN', 'MANAGER')


def get_supervisor_site_ids(user):
    """Site IDs this user is actively posted to, via SiteAssignment."""
    from apps.sites.models import SiteAssignment  # local import avoids circular import risk
    profile = getattr(user, 'employee_profile', None)
    if not profile:
        return SiteAssignment.objects.none().values_list('site_id', flat=True)
    return SiteAssignment.objects.filter(
        employee=profile, is_active=True
    ).values_list('site_id', flat=True)


class ShiftPermission(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.role):
            return False
        role_name = request.user.role.name
        if role_name == 'ADMIN':
            return True
        if role_name == 'MANAGER':
            return request.method in SAFE_METHODS
        if role_name == 'SUPERVISOR':
            return True
        return False

    def has_object_permission(self, request, view, obj):
        role_name = request.user.role.name
        if role_name == 'ADMIN':
            return True
        if role_name == 'MANAGER':
            return request.method in SAFE_METHODS
        if role_name == 'SUPERVISOR':
            return obj.site_id in get_supervisor_site_ids(request.user)
        return False


class ShiftAssignmentPermission(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.role):
            return False
        role_name = request.user.role.name
        if role_name == 'ADMIN':
            return True
        if role_name == 'MANAGER':
            return request.method in SAFE_METHODS
        if role_name == 'SUPERVISOR':
            return True
        if role_name == 'GUARD':
            return request.method in SAFE_METHODS
        return False

    def has_object_permission(self, request, view, obj):
        role_name = request.user.role.name
        if role_name == 'ADMIN':
            return True
        if role_name == 'MANAGER':
            return request.method in SAFE_METHODS
        if role_name == 'SUPERVISOR':
            return obj.shift.site_id in get_supervisor_site_ids(request.user)
        if role_name == 'GUARD':
            profile = getattr(request.user, 'employee_profile', None)
            return request.method in SAFE_METHODS and profile and obj.employee_id == profile.id
        return False
    
class IsOwnPayslipOrAdmin(BasePermission):
    """
    ADMIN: full CRUD on all payslips, plus bulk generation.
    MANAGER: read-only access to ALL payslips (list/retrieve), no write, no generation.
    Everyone else: can only list/retrieve their own payslip(s).
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.role):
            return False
        if request.user.role.name == 'ADMIN':
            return True
        return view.action in ('list', 'retrieve', 'my_payslips')

    def has_object_permission(self, request, view, obj):
        role_name = request.user.role.name
        if role_name == 'ADMIN':
            return True
        if role_name == 'MANAGER':
            return True
        return obj.employee.user_id == request.user.id


class PayrollPeriodPermission(BasePermission):
    """
    ADMIN: full CRUD (create periods, close them, etc.).
    MANAGER: read-only (list/retrieve) — can see periods exist, can't create/edit.
    Everyone else: no access.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.role):
            return False
        role_name = request.user.role.name
        if role_name == 'ADMIN':
            return True
        if role_name == 'MANAGER':
            return request.method in SAFE_METHODS
        return False

class IsDirectorOrSecretary(IsManagerOrAdmin):
    """
    Director = ADMIN, Secretary = MANAGER. Both get full salary access.
    SUPERVISOR and GUARD are excluded entirely (inherited from IsManagerOrAdmin).
    """
    pass