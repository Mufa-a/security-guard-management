from django.db import models
from apps.core.models import BaseModel


class Attendance(BaseModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CHECKED_IN = "CHECKED_IN", "Checked In"
        CHECKED_OUT = "CHECKED_OUT", "Checked Out"
        ABSENT = "ABSENT", "Absent"
        LATE = "LATE", "Late"

    shift_assignment = models.OneToOneField(
        'shifts.ShiftAssignment', on_delete=models.CASCADE, related_name='attendance'
    )
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)

    check_in_time = models.DateTimeField(null=True, blank=True)
    check_out_time = models.DateTimeField(null=True, blank=True)

    check_in_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_in_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_out_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_out_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    # Photo verification fields intentionally omitted for now.
    # When added later, they'll be nullable so no data migration/backfill is needed.

    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-check_in_time']

    def __str__(self):
        return f"{self.shift_assignment} - {self.status}"