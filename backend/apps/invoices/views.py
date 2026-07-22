from rest_framework import viewsets
from apps.core.permissions import IsInvoiceManagerOrReadOnly
from .models import Invoice, InvoiceLineItem
from .serializers import InvoiceSerializer, InvoiceLineItemSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related('client').prefetch_related('line_items').all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsInvoiceManagerOrReadOnly]


class InvoiceLineItemViewSet(viewsets.ModelViewSet):
    queryset = InvoiceLineItem.objects.select_related('invoice').all()
    serializer_class = InvoiceLineItemSerializer
    permission_classes = [IsInvoiceManagerOrReadOnly]