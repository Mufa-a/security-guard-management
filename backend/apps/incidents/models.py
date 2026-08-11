from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Max
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

    incident_number = models.CharField(max_length=20, unique=True, editable=False, blank=True)

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
    assigned_to = models.ForeignKey(
        'staff.EmployeeProfile', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_incidents',
    )

    category = models.CharField(max_length=25, choices=Category.choices, default=Category.OTHER)
    severity = models.CharField(max_length=10, choices=Severity.choices, default=Severity.LOW)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.OPEN)

    title = models.CharField(max_length=255)
    description = models.TextField()
    occurred_at = models.DateTimeField()

    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    class Meta:
        ordering = ['-occurred_at']

    def clean(self):
        if not self.site and not self.shift_assignment:
            raise ValidationError(
                "An incident must have either a site or a shift_assignment (from which the site is derived)."
            )

    def _generate_incident_number(self):
        year = self.occurred_at.year if self.occurred_at else __import__('datetime').date.today().year
        prefix = f"INC-{year}-"
        last = (
            Incident.objects.filter(incident_number__startswith=prefix)
            .aggregate(Max('incident_number'))['incident_number__max']
        )
        next_seq = int(last.split('-')[-1]) + 1 if last else 1
        return f"{prefix}{next_seq:06d}"

    def save(self, *args, **kwargs):
        if not self.site_id and self.shift_assignment_id:
            self.site = self.shift_assignment.shift.site
        if not self.incident_number:
            self.incident_number = self._generate_incident_number()
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.incident_number} - {self.title}"


class IncidentAttachment(BaseModel):
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='incidents/%Y/%m/')
    description = models.CharField(max_length=255, blank=True)
    uploaded_by = models.ForeignKey(
        'staff.EmployeeProfile', on_delete=models.SET_NULL, null=True, related_name='+'
    )

    def __str__(self):
        return f"Attachment for {self.incident.incident_number}"


class IncidentActivity(BaseModel):
    class ActivityType(models.TextChoices):
        CREATED = "CREATED", "Created"
        STATUS_CHANGED = "STATUS_CHANGED", "Status Changed"
        ASSIGNED = "ASSIGNED", "Assigned"
        COMMENT = "COMMENT", "Comment"
        EVIDENCE_ADDED = "EVIDENCE_ADDED", "Evidence Added"

    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='activities')
    actor = models.ForeignKey('staff.EmployeeProfile', on_delete=models.SET_NULL, null=True, related_name='+')
    activity_type = models.CharField(max_length=20, choices=ActivityType.choices)
    note = models.TextField(blank=True)  # comment text, or auto-generated description

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.incident.incident_number}: {self.activity_type}"


class Witness(BaseModel):
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='witnesses')
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True)
    statement = models.TextField(blank=True)

    def __str__(self):
        return f"{self.name} ({self.incident.incident_number})"


class IncidentPerson(BaseModel):
    class Role(models.TextChoices):
        VICTIM = "VICTIM", "Victim"
        SUSPECT = "SUSPECT", "Suspect"
        REPORTING_GUARD = "REPORTING_GUARD", "Reporting Guard"
        RESPONDING_OFFICER = "RESPONDING_OFFICER", "Responding Officer"
        SUPERVISOR = "SUPERVISOR", "Supervisor"
        OTHER = "OTHER", "Other"

    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='people_involved')
    role = models.CharField(max_length=25, choices=Role.choices)
    name = models.CharField(max_length=255)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.name} ({self.role}) - {self.incident.incident_number}"