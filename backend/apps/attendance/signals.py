from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.shifts.models import ShiftAssignment
from .models import Attendance


@receiver(post_save, sender=ShiftAssignment)
def create_attendance_for_shift_assignment(sender, instance, created, **kwargs):
    if created:
        Attendance.objects.get_or_create(shift_assignment=instance)