from django.db import models
from apps.core.models import BaseModel


class Expense(BaseModel):
    class Category(models.TextChoices):
        FUEL = "FUEL", "Fuel"
        EQUIPMENT = "EQUIPMENT", "Equipment / Uniforms"
        VEHICLE_MAINTENANCE = "VEHICLE_MAINTENANCE", "Vehicle Maintenance"
        RENT_UTILITIES = "RENT_UTILITIES", "Rent / Utilities"
        LICENSES = "LICENSES", "Licenses / Permits"
        OTHER = "OTHER", "Other"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PAID = "PAID", "Paid"
        OVERDUE = "OVERDUE", "Overdue"

    category = models.CharField(max_length=30, choices=Category.choices, default=Category.OTHER)
    vendor_name = models.CharField(max_length=255, blank=True)
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    expense_date = models.DateField()
    due_date = models.DateField(null=True, blank=True)
    payment_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-expense_date']

    def __str__(self):
        return f"{self.description} — KES {self.amount} ({self.status})"