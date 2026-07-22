from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from django.db import models
from django.utils import timezone
from apps.core.models import BaseModel


class EmployeeProfile(BaseModel):
    class Gender(models.TextChoices):
        MALE = "MALE", "Male"
        FEMALE = "FEMALE", "Female"
        OTHER = "OTHER", "Other"

    class EmploymentStatus(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        ON_LEAVE = "ON_LEAVE", "On Leave"
        SUSPENDED = "SUSPENDED", "Suspended"
        TERMINATED = "TERMINATED", "Terminated"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="employee_profile"
    )
    employee_number = models.CharField(max_length=20, unique=True, blank=True)
    national_id = models.CharField(max_length=20, unique=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=Gender.choices, blank=True)
    physical_address = models.CharField(max_length=255, blank=True)
    next_of_kin_name = models.CharField(max_length=150, blank=True)
    next_of_kin_phone = models.CharField(max_length=20, blank=True)
    date_employed = models.DateField()
    employment_status = models.CharField(
        max_length=20, choices=EmploymentStatus.choices, default=EmploymentStatus.ACTIVE
    )
    height_cm = models.PositiveSmallIntegerField(null=True, blank=True)
    photo = models.ImageField(upload_to="staff/photos/", null=True, blank=True)

    # PIN login (guards only, in practice) — never store the raw PIN.
    pin_hash = models.CharField(max_length=255, blank=True, null=True)
    pin_attempts = models.PositiveSmallIntegerField(default=0)
    pin_locked_until = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.employee_number:
            self.employee_number = self._generate_employee_number()
        super().save(*args, **kwargs)

    def _generate_employee_number(self):
        role_name = self.user.role.name if self.user.role else None
        prefix = 'GRD' if role_name == 'GUARD' else 'STF'

        last = (
            EmployeeProfile.objects
            .filter(employee_number__startswith=f'{prefix}-')
            .order_by('-employee_number')
            .first()
        )
        last_num = 0
        if last:
            try:
                last_num = int(last.employee_number.split('-')[-1])
            except (ValueError, IndexError):
                last_num = 0

        return f'{prefix}-{last_num + 1:03d}'

    def __str__(self):
        return f"{self.employee_number} — {self.user.email}"

    def set_pin(self, raw_pin):
        """Hash and store a new PIN, clearing any lockout state."""
        self.pin_hash = make_password(raw_pin)
        self.pin_attempts = 0
        self.pin_locked_until = None

    def check_pin(self, raw_pin):
        if not self.pin_hash:
            return False
        return check_password(raw_pin, self.pin_hash)

    def is_pin_locked(self):
        return bool(self.pin_locked_until and self.pin_locked_until > timezone.now())


class EmployeeDocument(BaseModel):
    class DocumentType(models.TextChoices):
        NATIONAL_ID = "NATIONAL_ID", "National ID"
        CERTIFICATE_OF_GOOD_CONDUCT = "GOOD_CONDUCT", "Certificate of Good Conduct"
        GUARD_LICENSE = "GUARD_LICENSE", "Guard License"
        MEDICAL_CERT = "MEDICAL_CERT", "Medical Certificate"
        CONTRACT = "CONTRACT", "Employment Contract"
        OTHER = "OTHER", "Other"

    employee = models.ForeignKey(
        EmployeeProfile, on_delete=models.CASCADE, related_name="documents"
    )
    document_type = models.CharField(max_length=30, choices=DocumentType.choices)
    file = models.FileField(upload_to="staff/documents/")
    issue_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    notes = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.employee.employee_number} — {self.get_document_type_display()}"