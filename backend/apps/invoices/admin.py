from django.contrib import admin
from .models import Invoice, InvoiceLineItem


class InvoiceLineItemInline(admin.TabularInline):
    model = InvoiceLineItem
    extra = 1
    readonly_fields = ('total_price',)


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'client', 'status', 'issue_date', 'due_date', 'subtotal')
    list_filter = ('status', 'client')
    search_fields = ('invoice_number', 'client__name')
    date_hierarchy = 'issue_date'
    inlines = [InvoiceLineItemInline]

    def subtotal(self, obj):
        return obj.subtotal


@admin.register(InvoiceLineItem)
class InvoiceLineItemAdmin(admin.ModelAdmin):
    list_display = ('invoice', 'description', 'quantity', 'unit_price', 'total_price')