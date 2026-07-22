from rest_framework.routers import DefaultRouter
from .views import InvoiceViewSet, InvoiceLineItemViewSet

router = DefaultRouter()
router.register('invoices', InvoiceViewSet, basename='invoice')
router.register('line-items', InvoiceLineItemViewSet, basename='invoice-line-item')

urlpatterns = router.urls