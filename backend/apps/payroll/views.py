from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import IsAdmin, IsOwnPayslipOrAdmin, IsDirectorOrSecretary, PayrollPeriodPermission
from apps.staff.models import EmployeeProfile

from .models import PayrollPeriod, SalaryStructure, Allowance, Deduction, Payslip
from .serializers import (
    PayrollPeriodSerializer,
    SalaryStructureSerializer,
    AllowanceSerializer,
    DeductionSerializer,
    PayslipSerializer,
)
from .services import generate_payslip


class PayrollPeriodViewSet(viewsets.ModelViewSet):
    queryset = PayrollPeriod.objects.all()
    serializer_class = PayrollPeriodSerializer
    permission_classes = [PayrollPeriodPermission]


class SalaryStructureViewSet(viewsets.ModelViewSet):
    queryset = SalaryStructure.objects.select_related('employee__user').all()
    serializer_class = SalaryStructureSerializer
    permission_classes = [IsDirectorOrSecretary]

    def get_queryset(self):
        qs = super().get_queryset()
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs


class AllowanceViewSet(viewsets.ModelViewSet):
    queryset = Allowance.objects.select_related('employee__user').all()
    serializer_class = AllowanceSerializer
    permission_classes = [IsDirectorOrSecretary]

    def get_queryset(self):
        qs = super().get_queryset()
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs


class DeductionViewSet(viewsets.ModelViewSet):
    queryset = Deduction.objects.select_related('employee__user').all()
    serializer_class = DeductionSerializer
    permission_classes = [IsDirectorOrSecretary]

    def get_queryset(self):
        qs = super().get_queryset()
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs


class PayslipViewSet(viewsets.ModelViewSet):
    queryset = Payslip.objects.select_related('employee__user', 'period').all()
    serializer_class = PayslipSerializer
    permission_classes = [IsOwnPayslipOrAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role.name in ('ADMIN', 'MANAGER'):
            return qs
        return qs.filter(employee__user=user)
        # Everyone else (MANAGER included): only ever see their own
        # payslips, at the queryset level too — has_object_permission
        # alone isn't enough to stop them enumerating other employees'
        # payslip IDs via list().
        return qs.filter(employee__user=user)

    @action(detail=False, methods=['get'], url_path='my-payslips')
    def my_payslips(self, request):
        qs = self.get_queryset().filter(employee__user=request.user)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='generate')
    def generate(self, request):
        """
        Generate payslips for the given period_id. If employee_ids is
        provided, only those employees are processed; otherwise every
        active employee with a SalaryStructure is included. Skips
        employees who already have a payslip for that period instead
        of erroring out the whole batch.
        """
        if request.user.role.name != 'ADMIN':
            return Response(
                {'detail': 'Only admins can generate payslips.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        period_id = request.data.get('period_id')
        employee_ids = request.data.get('employee_ids')  # optional list of IDs
        if not period_id:
            return Response({'detail': 'period_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            period = PayrollPeriod.objects.get(id=period_id)
        except PayrollPeriod.DoesNotExist:
            return Response({'detail': 'Payroll period not found.'}, status=status.HTTP_404_NOT_FOUND)

        eligible_employees = EmployeeProfile.objects.filter(is_active=True)
        if employee_ids:
            eligible_employees = eligible_employees.filter(id__in=employee_ids)

        created, skipped = [], []
        for employee in eligible_employees:
            try:
                payslip = generate_payslip(employee, period)
                created.append(payslip.id)
            except ValueError as e:
                skipped.append({'employee': str(employee), 'reason': str(e)})

        return Response(
            {'created_count': len(created), 'skipped': skipped},
            status=status.HTTP_201_CREATED,
        )