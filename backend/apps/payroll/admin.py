from django.contrib import admin
from .models import PayrollPeriod, SalaryStructure, Allowance, Deduction, Payslip


@admin.register(PayrollPeriod)
class PayrollPeriodAdmin(admin.ModelAdmin):
    list_display = ('period_start', 'period_end', 'status')
    list_filter = ('status',)


@admin.register(SalaryStructure)
class SalaryStructureAdmin(admin.ModelAdmin):
    list_display = ('employee', 'basic_salary', 'payment_frequency', 'effective_from', 'effective_to', 'is_active')
    list_filter = ('payment_frequency', 'is_active')
    search_fields = ('employee__employee_number', 'employee__user__email')


@admin.register(Allowance)
class AllowanceAdmin(admin.ModelAdmin):
    list_display = ('employee', 'allowance_type', 'amount', 'is_recurring', 'is_taxable', 'is_active')
    list_filter = ('allowance_type', 'is_recurring', 'is_active')


@admin.register(Deduction)
class DeductionAdmin(admin.ModelAdmin):
    list_display = ('employee', 'deduction_type', 'amount', 'is_recurring', 'is_active')
    list_filter = ('deduction_type', 'is_recurring', 'is_active')


@admin.register(Payslip)
class PayslipAdmin(admin.ModelAdmin):
    list_display = ('employee', 'period', 'gross_pay', 'net_pay', 'status', 'generated_at')
    list_filter = ('status',)
    search_fields = ('employee__employee_number', 'employee__user__email')