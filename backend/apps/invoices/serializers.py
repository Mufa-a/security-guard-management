from rest_framework import serializers
from .models import Invoice, InvoiceLineItem


class InvoiceLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceLineItem
        fields = ['id', 'invoice', 'description', 'quantity', 'unit_price', 'total_price']
        read_only_fields = ['id', 'total_price']


class InvoiceSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    line_items = InvoiceLineItemSerializer(many=True, read_only=True)
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    balance_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'client', 'client_name', 'invoice_number', 'issue_date', 'due_date',
            'status', 'notes', 'line_items', 'subtotal', 'amount_paid', 'balance_due',
            'is_overdue', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'invoice_number', 'amount_paid', 'created_at', 'updated_at']