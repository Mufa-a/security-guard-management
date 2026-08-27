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
    GUARD: can list/retrieve their own record, use check_in/check_out, and
    submit (but not review) their own explain_absence.
    SUPERVISOR and above: full CRUD on all records, plus review_absence.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.role):
            return False
        role_name = request.user.role.name
        if role_name == 'GUARD':
            return view.action in ('list', 'retrieve', 'check_in', 'check_out', 'submit_late_arrival_request')
        return role_name in ('ADMIN', 'MANAGER', 'SUPERVISOR')

    def has_object_permission(self, request, view, obj):
        role_name = request.user.role.name
        if role_name in ('ADMIN', 'MANAGER', 'SUPERVISOR'):
            return True
        if role_name == 'GUARD':
            return obj.shift_assignment.employee.user_id == request.user.id
        return False
    

def _incident_reported_by_id(obj):
    """
    Resolve the reporting employee id for either an Incident itself, or any
    object that has a direct `incident` FK to one (attachments, witnesses,
    people-involved, activities). Returns None if it can't be resolved,
    so callers can fail closed rather than raising AttributeError.
    """
    if hasattr(obj, 'reported_by_id'):
        return obj.reported_by_id
    incident = getattr(obj, 'incident', None)
    if incident is not None:
        return getattr(incident, 'reported_by_id', None)
    return None


class CanReportIncidentOrSupervisor(BasePermission):
    """
    GUARD: can create incidents and view only their own reports (and related
    attachments/witnesses/people/comments on those reports). Cannot edit
    incident fields like status after submission.
    SUPERVISOR and above: full access to all incidents, including status updates.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.role):
            return False
        role_name = request.user.role.name
        if role_name == 'GUARD':
            allowed_actions = ('list', 'retrieve', 'create', 'add_comment', 'download')
            return view.action in allowed_actions
        return role_name in ('ADMIN', 'MANAGER', 'SUPERVISOR')

    def has_object_permission(self, request, view, obj):
        role_name = request.user.role.name
        if role_name in ('ADMIN', 'MANAGER', 'SUPERVISOR'):
            return True
        if role_name == 'GUARD':
            owner_id = _incident_reported_by_id(obj)
            if owner_id is None or owner_id != getattr(request.user.employee_profile, 'id', None):
                return False
            # Guards may only read (GET/HEAD/OPTIONS), or hit the explicitly
            # whitelisted add_comment/download actions on their own incident.
            if request.method in SAFE_METHODS:
                return True
            return view.action in ('add_comment',)
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
        if role_name in ('ADMIN', 'SUPERVISOR', 'MANAGER'):
            return True
        return False

    def has_object_permission(self, request, view, obj):
        role_name = request.user.role.name
        if role_name in ('ADMIN', 'SUPERVISOR', 'MANAGER'):
            return True
        return False


class ShiftAssignmentPermission(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.role):
            return False
        role_name = request.user.role.name
        if role_name in ('ADMIN', 'SUPERVISOR', 'MANAGER'):
            return True
        if role_name == 'GUARD':
            return request.method in SAFE_METHODS
        return False

    def has_object_permission(self, request, view, obj):
        role_name = request.user.role.name
        if role_name in ('ADMIN', 'SUPERVISOR', 'MANAGER'):
            return True
        if role_name == 'GUARD':
            profile = getattr(request.user, 'employee_profile', None)
            return request.method in SAFE_METHODS and profile and obj.employee_id == profile.id
        return False
    
class IsOwnPayslipOrAdmin(BasePermission):
    """
    ADMIN: full CRUD on all payslips, plus bulk generation.
    MANAGER: read-only access to ALL payslips (list/retrieve), no write, no generation.
    SUPERVISOR and GUARD: no access at all — payslips are printed by the
    office, not self-served, per client request.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.role):
            return False
        role_name = request.user.role.name
        if role_name == 'ADMIN':
            return True
        if role_name == 'MANAGER':
            return view.action in ('list', 'retrieve')
        return False

    def has_object_permission(self, request, view, obj):
        role_name = request.user.role.name
        return role_name in ('ADMIN', 'MANAGER')


class PayrollPeriodPermission(BasePermission):
    """
    ADMIN: full CRUD (create periods, close them, etc.).
    MANAGER: read-only (list/retrieve) — needed to filter/view payslips
    by period, but cannot create, edit, or close periods.
    SUPERVISOR and GUARD: no access at all.
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