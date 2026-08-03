from rest_framework import serializers
from .models import PayrollPeriod, SalaryStructure, Allowance, Deduction, Payslip


class PayrollPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollPeriod
        fields = [
            'id', 'period_start', 'period_end', 'status',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SalaryStructureSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.email', read_only=True)

    class Meta:
        model = SalaryStructure
        fields = [
            'id', 'employee', 'employee_name', 'basic_salary', 'payment_frequency',
            'overtime_rate', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class AllowanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.email', read_only=True)

    class Meta:
        model = Allowance
        fields = [
            'id', 'employee', 'employee_name', 'allowance_type', 'amount',
            'is_recurring', 'is_taxable', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DeductionSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.email', read_only=True)

    class Meta:
        model = Deduction
        fields = [
            'id', 'employee', 'employee_name', 'deduction_type', 'amount',
            'is_recurring', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PayslipSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.email', read_only=True)
    period_detail = serializers.CharField(source='period.__str__', read_only=True)

    class Meta:
        model = Payslip
        fields = [
            'id', 'period', 'period_detail', 'employee', 'employee_name',
            'basic_salary', 'total_allowances', 'gross_pay',
            'nssf_employee', 'shif_contribution', 'housing_levy',
            'taxable_income', 'paye_tax', 'total_other_deductions', 'net_pay',
            'status', 'pdf_file', 'generated_at',
            'is_active', 'created_at', 'updated_at',
        ]
        # Every financial figure is computed by services.generate_payslip —
        # never accepted directly from the client, only ever read.
        read_only_fields = [
            'id', 'basic_salary', 'total_allowances', 'gross_pay',
            'nssf_employee', 'shif_contribution', 'housing_levy',
            'taxable_income', 'paye_tax', 'total_other_deductions', 'net_pay',
            'generated_at', 'created_at', 'updated_at',
        ]