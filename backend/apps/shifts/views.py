from rest_framework import viewsets, serializers as drf_serializers
from apps.core.permissions import ShiftPermission, ShiftAssignmentPermission, get_supervisor_site_ids
from .models import Shift, ShiftAssignment
from .serializers import ShiftSerializer, ShiftAssignmentSerializer


class ShiftViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftSerializer
    permission_classes = [ShiftPermission]

    def get_queryset(self):
        qs = Shift.objects.select_related('site').all()
        user = self.request.user
        role_name = user.role.name
        if role_name == 'SUPERVISOR':
            return qs.filter(site_id__in=get_supervisor_site_ids(user))
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if user.role.name == 'SUPERVISOR':
            site = serializer.validated_data.get('site')
            if site.id not in get_supervisor_site_ids(user):
                raise drf_serializers.ValidationError(
                    {'site': 'You can only create shifts for sites you manage.'}
                )
        serializer.save()


class ShiftAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftAssignmentSerializer
    permission_classes = [ShiftAssignmentPermission]

    def get_queryset(self):
        qs = ShiftAssignment.objects.select_related('shift__site', 'employee__user').all()
        user = self.request.user
        role_name = user.role.name
        if role_name == 'GUARD':
            profile = getattr(user, 'employee_profile', None)
            return qs.filter(employee=profile) if profile else qs.none()
        if role_name == 'SUPERVISOR':
            return qs.filter(shift__site_id__in=get_supervisor_site_ids(user))
        return qs