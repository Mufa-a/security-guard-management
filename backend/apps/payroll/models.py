"""
Payroll models.

Statutory deduction figures (PAYE, NSSF, SHIF, AHL) are calculated in
rates.py / services.py and stored directly on Payslip as computed
snapshots — never recalculated after generation, so historical payslips
stay accurate even after a Finance Act rate change.
"""

from django.db import models
from django.db.models import Q
from apps.core.models import BaseModel


class PayrollPeriod(BaseModel):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        CLOSED = "CLOSED", "Closed"

    period_start = models.DateField()
    period_end = models.DateField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)

    class Meta:
        ordering = ['-period_start']
        unique_together = ('period_start', 'period_end')

    def __str__(self):
        return f"{self.period_start} to {self.period_end} ({self.status})"


class SalaryStructure(BaseModel):
    """
    Historical salary records — an employee can have multiple rows over
    time. effective_to = null means this is the currently active one.
    """

    class PaymentFrequency(models.TextChoices):
        MONTHLY = "MONTHLY", "Monthly"
        WEEKLY = "WEEKLY", "Weekly"
        BI_WEEKLY = "BI_WEEKLY", "Bi-Weekly"

    employee = models.ForeignKey(
        'staff.EmployeeProfile', on_delete=models.CASCADE, related_name='salary_structures'
    )
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    payment_frequency = models.CharField(
        max_length=20, choices=PaymentFrequency.choices, default=PaymentFrequency.MONTHLY
    )
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)  # null = currently active
    overtime_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        ordering = ['-effective_from']

    def __str__(self):
        return f"{self.employee} - KES {self.basic_salary}/{self.payment_frequency} from {self.effective_from}"

    @classmethod
    def effective_for(cls, employee, as_of_date):
        """
        The SalaryStructure in effect for this employee on a specific date —
        started on or before as_of_date, and either still open (no end date)
        or ended on or after as_of_date.
        """
        return (
            cls.objects.filter(employee=employee, effective_from__lte=as_of_date)
            .filter(Q(effective_to__isnull=True) | Q(effective_to__gte=as_of_date))
            .order_by('-effective_from')
            .first()
        )


class Allowance(BaseModel):
    ALLOWANCE_TYPES = [
        ("HOUSING", "Housing"),
        ("TRANSPORT", "Transport"),
        ("MEDICAL", "Medical"),
        ("COMMISSION", "Commission"),
        ("OTHER", "Other"),
    ]

    employee = models.ForeignKey(
        'staff.EmployeeProfile', on_delete=models.CASCADE, related_name='allowances'
    )
    allowance_type = models.CharField(max_length=20, choices=ALLOWANCE_TYPES, default="OTHER")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_recurring = models.BooleanField(default=True)
    is_taxable = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.employee} - {self.allowance_type}: KES {self.amount}"


class Deduction(BaseModel):
    """
    Non-statutory deductions only (loans, uniform costs, disciplinary
    deductions, etc.). PAYE/NSSF/SHIF/AHL are computed at payslip
    generation time, not entered here.
    """

    DEDUCTION_TYPES = [
        ("LOAN", "Loan Repayment"),
        ("UNIFORM", "Uniform / Equipment"),
        ("DISCIPLINARY", "Disciplinary"),
        ("OTHER", "Other"),
    ]

    employee = models.ForeignKey(
        'staff.EmployeeProfile', on_delete=models.CASCADE, related_name='deductions'
    )
    deduction_type = models.CharField(max_length=20, choices=DEDUCTION_TYPES, default="OTHER")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_recurring = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.employee} - {self.deduction_type}: KES {self.amount}"


class Payslip(BaseModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        APPROVED = "APPROVED", "Approved"
        PAID = "PAID", "Paid"

    period = models.ForeignKey(PayrollPeriod, on_delete=models.PROTECT, related_name='payslips')
    employee = models.ForeignKey(
        'staff.EmployeeProfile', on_delete=models.PROTECT, related_name='payslips'
    )

    # Earnings (snapshotted at generation time)
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    total_allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gross_pay = models.DecimalField(max_digits=12, decimal_places=2)

    # Statutory deductions (computed, stored as snapshots)
    nssf_employee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shif_contribution = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    housing_levy = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    taxable_income = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paye_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Non-statutory deductions (sum of applicable Deduction rows this period)
    total_other_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    net_pay = models.DecimalField(max_digits=12, decimal_places=2)

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    pdf_file = models.FileField(upload_to='payslips/', null=True, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-period__period_start']
        unique_together = ('period', 'employee')

    def __str__(self):
        return f"Payslip: {self.employee} - {self.period}"