from decimal import Decimal
from django.db import models
from apps.core.models import BaseModel


class Invoice(BaseModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SENT = "SENT", "Sent"
        PAID = "PAID", "Paid"
        OVERDUE = "OVERDUE", "Overdue"
        CANCELLED = "CANCELLED", "Cancelled"

    client = models.ForeignKey('sites.Client', on_delete=models.PROTECT, related_name='invoices')
    invoice_number = models.CharField(max_length=30, unique=True, blank=True)
    issue_date = models.DateField()
    due_date = models.DateField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-issue_date']

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = self._generate_invoice_number()
        super().save(*args, **kwargs)

    def _generate_invoice_number(self):
        last = (
            Invoice.objects.filter(invoice_number__startswith='INV-')
            .order_by('-invoice_number')
            .first()
        )
        last_num = 0
        if last:
            try:
                last_num = int(last.invoice_number.split('-')[-1])
            except (ValueError, IndexError):
                last_num = 0
        return f'INV-{last_num + 1:03d}'

    @property
    def subtotal(self):
        return sum((item.total_price for item in self.line_items.all()), Decimal('0.00'))

    def __str__(self):
        return f"Invoice {self.invoice_number} — {self.client.name}"


class InvoiceLineItem(BaseModel):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='line_items')
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('1.00'))
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    total_price = models.DecimalField(max_digits=12, decimal_places=2, editable=False)

    def save(self, *args, **kwargs):
        self.total_price = (self.quantity or 0) * (self.unit_price or 0)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.description} — {self.invoice.invoice_number}"