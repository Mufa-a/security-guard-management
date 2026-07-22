from rest_framework.routers import DefaultRouter
from .views import (
    PayrollPeriodViewSet,
    SalaryStructureViewSet,
    AllowanceViewSet,
    DeductionViewSet,
    PayslipViewSet,
)

router = DefaultRouter()
router.register('periods', PayrollPeriodViewSet, basename='payroll-period')
router.register('salary-structures', SalaryStructureViewSet, basename='salary-structure')
router.register('allowances', AllowanceViewSet, basename='allowance')
router.register('deductions', DeductionViewSet, basename='deduction')
router.register('payslips', PayslipViewSet, basename='payslip')

urlpatterns = router.urls