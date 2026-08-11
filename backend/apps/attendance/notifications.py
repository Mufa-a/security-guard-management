"""
attendance/notifications.py

Thin helper layer for creating AttendanceNotification rows. Nothing here
sends email/SMS/push -- it just writes the in-app notification record.
If you later want to push these out over a channel, this is the one
place to hook that in (see `notify()`).
"""
from django.contrib.auth import get_user_model

from .models import AttendanceNotification

User = get_user_model()


def notify(recipient, notification_type, *, message, attendance=None, late_arrival_request=None):
    return AttendanceNotification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        attendance=attendance,
        late_arrival_request=late_arrival_request,
        message=message,
    )


def get_supervisor_recipients():
    """
    Matches the same role set as IsSupervisorOrAbove: ADMIN, MANAGER,
    SUPERVISOR all get supervisor-facing notifications.
    """
    return User.objects.filter(role__name__in=["ADMIN", "MANAGER", "SUPERVISOR"])


def notify_supervisors(notification_type, *, message, attendance=None, late_arrival_request=None):
    return [
        notify(
            user, notification_type, message=message,
            attendance=attendance, late_arrival_request=late_arrival_request,
        )
        for user in get_supervisor_recipients()
    ]


def guard_user(attendance):
    """The User behind an Attendance record's assigned guard."""
    return attendance.shift_assignment.employee.user
