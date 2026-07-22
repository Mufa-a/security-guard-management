from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import IsSupervisorOrAbove, IsAdmin
from apps.sites.models import SiteAssignment
from apps.shifts.models import ShiftAssignment
from apps.payroll.models import SalaryStructure

from .models import EmployeeProfile, EmployeeDocument
from .serializers import (
    EmployeeProfileSerializer,
    EmployeeProfileCreateSerializer,
    EmployeeDocumentSerializer,
)


class EmployeeProfileViewSet(viewsets.ModelViewSet):
    queryset = EmployeeProfile.objects.select_related("user").prefetch_related("documents").all()
    permission_classes = [permissions.IsAuthenticated, IsSupervisorOrAbove]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return EmployeeProfileCreateSerializer
        return EmployeeProfileSerializer

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        try:
            profile = EmployeeProfile.objects.select_related('user').prefetch_related('documents').get(user=request.user)
        except EmployeeProfile.DoesNotExist:
            return Response(None)
        return Response(EmployeeProfileSerializer(profile).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsAdmin])
    def terminate(self, request, pk=None):
        """
        Full termination flow, atomic — either everything below happens,
        or nothing does:
          1. Revoke login access immediately
          2. End their current site assignment
          3. Cancel future shift assignments
          4. Close out their current salary structure (stops future payroll)
          5. Set employment_status to TERMINATED

        History (past attendance, payslips, incidents) is left untouched.
        """
        employee = self.get_object()
        today = timezone.now().date()

        with transaction.atomic():
            employee.user.is_active = False
            employee.user.save(update_fields=['is_active'])

            SiteAssignment.objects.filter(
                employee=employee, end_date__isnull=True
            ).update(end_date=today)

            ShiftAssignment.objects.filter(
                employee=employee,
                status__in=['ASSIGNED', 'CONFIRMED'],
                shift__date__gte=today,
            ).update(status='CANCELLED')

            SalaryStructure.objects.filter(
                employee=employee, effective_to__isnull=True
            ).update(effective_to=today)

            employee.employment_status = EmployeeProfile.EmploymentStatus.TERMINATED
            employee.save(update_fields=['employment_status'])

        return Response(EmployeeProfileSerializer(employee).data)

    @action(detail=True, methods=['post'], url_path='set-pin', permission_classes=[permissions.IsAuthenticated, IsAdmin])
    def set_pin(self, request, pk=None):
        """Admin sets or resets a guard's PIN."""
        employee = self.get_object()
        pin = request.data.get('pin', '')
        if not (pin.isdigit() and len(pin) == 6):
            return Response({'detail': 'PIN must be exactly 6 digits.'}, status=400)
        employee.set_pin(pin)
        employee.save(update_fields=['pin_hash', 'pin_attempts', 'pin_locked_until'])
        return Response({'detail': 'PIN set successfully.'})

    @action(detail=False, methods=['post'], url_path='change-my-pin', permission_classes=[permissions.IsAuthenticated])
    def change_my_pin(self, request):
        """The logged-in guard changes their own PIN — requires the current one."""
        try:
            employee = EmployeeProfile.objects.get(user=request.user)
        except EmployeeProfile.DoesNotExist:
            return Response({'detail': 'No employee profile found.'}, status=404)

        current_pin = request.data.get('current_pin', '')
        new_pin = request.data.get('new_pin', '')

        if not employee.check_pin(current_pin):
            return Response({'detail': 'Current PIN is incorrect.'}, status=400)
        if not (new_pin.isdigit() and len(new_pin) == 6):
            return Response({'detail': 'New PIN must be exactly 6 digits.'}, status=400)

        employee.set_pin(new_pin)
        employee.save(update_fields=['pin_hash', 'pin_attempts', 'pin_locked_until'])
        return Response({'detail': 'PIN changed successfully.'})


class EmployeeDocumentViewSet(viewsets.ModelViewSet):
    queryset = EmployeeDocument.objects.select_related("employee").all()
    serializer_class = EmployeeDocumentSerializer
    permission_classes = [permissions.IsAuthenticated, IsSupervisorOrAbove]