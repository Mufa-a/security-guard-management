from rest_framework import viewsets
from apps.core.permissions import ShiftPermission, ShiftAssignmentPermission
from .models import Shift, ShiftAssignment
from .serializers import ShiftSerializer, ShiftAssignmentSerializer


class ShiftViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftSerializer
    permission_classes = [ShiftPermission]

    def get_queryset(self):
        return Shift.objects.select_related('site').all()


class ShiftAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftAssignmentSerializer
    permission_classes = [ShiftAssignmentPermission]

    def get_queryset(self):
        qs = ShiftAssignment.objects.select_related('shift__site', 'employee__user').all()
        user = self.request.user
        if user.role.name == 'GUARD':
            profile = getattr(user, 'employee_profile', None)
            return qs.filter(employee=profile) if profile else qs.none()
        return qs