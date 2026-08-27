from decimal import Decimal
from datetime import date
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
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))

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

    @property
    def balance_due(self):
        return self.subtotal - self.amount_paid
    @property
    def balance_due(self):
        return self.subtotal - self.amount_paid

    @property
    def effective_status(self):
        """
        Single computed status for display — takes priority over the
        stored `status` wherever payment or due-date facts make it stale.
        The stored `status` is untouched and still fully manual; this is
        just what the UI should *show*.
        """
        if self.status == self.Status.CANCELLED:
            return self.Status.CANCELLED.value

        paid_something = self.amount_paid > Decimal('0.00')
        balance = self.balance_due

        if paid_something and balance <= Decimal('0.00'):
            return self.Status.PAID.value
        if self.due_date < date.today() and balance > Decimal('0.00'):
            return self.Status.OVERDUE.value
        if paid_something and balance > Decimal('0.00'):
            return 'PARTIALLY_PAID'

        return self.status


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