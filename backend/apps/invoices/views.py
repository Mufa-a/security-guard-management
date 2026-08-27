from decimal import Decimal, InvalidOperation
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import IsInvoiceManagerOrReadOnly
from .models import Invoice, InvoiceLineItem
from .serializers import InvoiceSerializer, InvoiceLineItemSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related('client').prefetch_related('line_items').all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsInvoiceManagerOrReadOnly]

    @action(detail=True, methods=['post'], url_path='record-payment')
    def record_payment(self, request, pk=None):
        invoice = self.get_object()

        raw_amount = request.data.get('amount')
        if raw_amount is None:
            return Response({'detail': 'amount is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(raw_amount))
        except InvalidOperation:
            return Response({'detail': 'amount must be a valid number.'}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= Decimal('0.00'):
            return Response({'detail': 'amount must be greater than zero.'}, status=status.HTTP_400_BAD_REQUEST)

        if invoice.status == Invoice.Status.CANCELLED:
            return Response({'detail': 'Cannot record a payment on a cancelled invoice.'}, status=status.HTTP_400_BAD_REQUEST)

        invoice.amount_paid = invoice.amount_paid + amount
        invoice.save(update_fields=['amount_paid', 'updated_at'])

        return Response(InvoiceSerializer(invoice).data)


class InvoiceLineItemViewSet(viewsets.ModelViewSet):
    queryset = InvoiceLineItem.objects.select_related('invoice').all()
    serializer_class = InvoiceLineItemSerializer
    permission_classes = [IsInvoiceManagerOrReadOnly]