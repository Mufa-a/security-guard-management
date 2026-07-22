from django.core.exceptions import ValidationError
from django.db import models
from apps.core.models import BaseModel


class Incident(BaseModel):
    class Category(models.TextChoices):
        THEFT = "THEFT", "Theft"
        TRESPASSING = "TRESPASSING", "Trespassing"
        VANDALISM = "VANDALISM", "Vandalism"
        MEDICAL = "MEDICAL", "Medical"
        FIRE = "FIRE", "Fire"
        PROPERTY_DAMAGE = "PROPERTY_DAMAGE", "Property Damage"
        SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY", "Suspicious Activity"
        OTHER = "OTHER", "Other"

    class Severity(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        CRITICAL = "CRITICAL", "Critical"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        UNDER_REVIEW = "UNDER_REVIEW", "Under Review"
        RESOLVED = "RESOLVED", "Resolved"
        CLOSED = "CLOSED", "Closed"

    site = models.ForeignKey(
        'sites.Site', on_delete=models.CASCADE, related_name='incidents',
        null=True, blank=True,
    )
    shift_assignment = models.ForeignKey(
        'shifts.ShiftAssignment', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='incidents',
    )
    reported_by = models.ForeignKey(
        'staff.EmployeeProfile', on_delete=models.SET_NULL, null=True,
        related_name='reported_incidents',
    )

    category = models.CharField(max_length=25, choices=Category.choices, default=Category.OTHER)
    severity = models.CharField(max_length=10, choices=Severity.choices, default=Severity.LOW)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.OPEN)

    title = models.CharField(max_length=255)
    description = models.TextField()
    occurred_at = models.DateTimeField()

    class Meta:
        ordering = ['-occurred_at']

    def clean(self):
        if not self.site and not self.shift_assignment:
            raise ValidationError(
                "An incident must have either a site or a shift_assignment (from which the site is derived)."
            )

    def save(self, *args, **kwargs):
        # Auto-derive site from shift_assignment if not explicitly set.
        if not self.site_id and self.shift_assignment_id:
            self.site = self.shift_assignment.shift.site
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.site.name if self.site else 'Unknown site'})"


class IncidentAttachment(BaseModel):
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='incidents/%Y/%m/')
    description = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"Attachment for {self.incident.title}"