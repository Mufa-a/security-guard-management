"""
Payroll calculation service.

generate_payslip() is the single entry point for building a Payslip.
All statutory figures come from rates.py.
"""

from decimal import Decimal, ROUND_HALF_UP

from .models import Allowance, Deduction, Payslip, SalaryStructure
from . import rates
from django.db.models import Q

def _round(amount):
    return Decimal(amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_nssf(gross_pay):
    """Employee NSSF: 6% on Tier I (up to the lower limit) + 6% on Tier II
    (between the lower and upper limits), capped at the upper limit."""
    lower = rates.NSSF_LOWER_EARNINGS_LIMIT
    upper = rates.NSSF_UPPER_EARNINGS_LIMIT
    pensionable_pay = min(gross_pay, upper)

    tier_1 = min(pensionable_pay, lower) * rates.NSSF_RATE
    tier_2 = max(pensionable_pay - lower, Decimal("0")) * rates.NSSF_RATE

    return _round(tier_1 + tier_2)


def calculate_shif(gross_pay):
    return _round(gross_pay * rates.SHIF_RATE)


def calculate_housing_levy(gross_pay):
    return _round(gross_pay * rates.HOUSING_LEVY_RATE)


def calculate_paye(taxable_income):
    """Progressive tax across PAYE_BANDS, less personal relief, floored at 0."""
    if taxable_income <= 0:
        return Decimal("0")

    gross_tax = Decimal("0")
    for lower, upper, rate in rates.PAYE_BANDS:
        if taxable_income <= lower:
            break
        band_top = upper if upper is not None else taxable_income
        taxable_in_band = min(taxable_income, band_top) - lower
        if taxable_in_band > 0:
            gross_tax += taxable_in_band * rate

    gross_tax = _round(gross_tax)
    net_tax = gross_tax - rates.PERSONAL_RELIEF
    return max(net_tax, Decimal("0"))


def generate_payslip(employee, period):
    """
    Build and save a Payslip for one employee for one PayrollPeriod.
    Raises ValueError if a payslip already exists for this employee/period,
    or if the employee has no SalaryStructure effective for that period.
    """
    if Payslip.objects.filter(employee=employee, period=period).exists():
        raise ValueError(f"A payslip already exists for {employee} in {period}.")

    salary_structure = SalaryStructure.effective_for(employee, period.period_start)
    if not salary_structure:
        raise ValueError(
            f"{employee} has no SalaryStructure effective for {period.period_start}."
        )

    basic_salary = salary_structure.basic_salary
    allowances = Allowance.objects.filter(employee=employee, is_active=True)
    total_allowances = sum((a.amount for a in allowances), Decimal("0"))
    taxable_allowances = sum((a.amount for a in allowances if a.is_taxable), Decimal("0"))

    gross_pay = basic_salary + total_allowances
    taxable_gross = basic_salary + taxable_allowances

    nssf_employee = calculate_nssf(gross_pay)
    shif_contribution = calculate_shif(gross_pay)
    housing_levy = calculate_housing_levy(gross_pay)

    taxable_income = max(
        taxable_gross - nssf_employee - shif_contribution - housing_levy, Decimal("0")
    )
    paye_tax = calculate_paye(taxable_income)

    deductions = Deduction.objects.filter(employee=employee, is_active=True)
    total_other_deductions = sum((d.amount for d in deductions), Decimal("0"))

    net_pay = (
        gross_pay
        - nssf_employee
        - shif_contribution
        - housing_levy
        - paye_tax
        - total_other_deductions
    )

    return Payslip.objects.create(
        period=period,
        employee=employee,
        basic_salary=basic_salary,
        total_allowances=total_allowances,
        gross_pay=gross_pay,
        nssf_employee=nssf_employee,
        shif_contribution=shif_contribution,
        housing_levy=housing_levy,
        taxable_income=taxable_income,
        paye_tax=paye_tax,
        total_other_deductions=total_other_deductions,
        net_pay=net_pay,
    )