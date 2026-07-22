from django.db import models
from apps.core.models import BaseModel


class Shift(BaseModel):
    class ShiftType(models.TextChoices):
        DAY = "DAY", "Day"
        NIGHT = "NIGHT", "Night"
        CUSTOM = "CUSTOM", "Custom"

    site = models.ForeignKey('sites.Site', on_delete=models.CASCADE, related_name='shifts')
    shift_type = models.CharField(max_length=10, choices=ShiftType.choices, default=ShiftType.DAY)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    required_guards = models.PositiveIntegerField(default=1)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-date', 'start_time']

    def __str__(self):
        return f"{self.site.name} - {self.date} ({self.shift_type})"


class ShiftAssignment(BaseModel):
    class Status(models.TextChoices):
        ASSIGNED = "ASSIGNED", "Assigned"
        CONFIRMED = "CONFIRMED", "Confirmed"
        COMPLETED = "COMPLETED", "Completed"
        NO_SHOW = "NO_SHOW", "No Show"
        CANCELLED = "CANCELLED", "Cancelled"

    shift = models.ForeignKey(Shift, on_delete=models.CASCADE, related_name='assignments')
    employee = models.ForeignKey('staff.EmployeeProfile', on_delete=models.CASCADE, related_name='shift_assignments')
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ASSIGNED)

    class Meta:
        unique_together = ('shift', 'employee')

    def __str__(self):
        return f"{self.employee} - {self.shift} ({self.status})"