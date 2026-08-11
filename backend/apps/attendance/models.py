from django.db import models
from django.conf import settings
from apps.core.models import BaseModel


class Attendance(BaseModel):
    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Scheduled"
        PRESENT = "PRESENT", "Present"
        PRESENT_LATE = "PRESENT_LATE", "Present (Late)"
        PRESENT_LATE_APPROVED = "PRESENT_LATE_APPROVED", "Present (Late Approved)"
        ABSENT = "ABSENT", "Absent"
        ON_LEAVE = "ON_LEAVE", "On Leave"
        OFF_DUTY = "OFF_DUTY", "Off Duty"

    shift_assignment = models.OneToOneField(
        'shifts.ShiftAssignment', on_delete=models.CASCADE, related_name='attendance'
    )
    status = models.CharField(max_length=25, choices=Status.choices, default=Status.SCHEDULED)

    check_in_time = models.DateTimeField(null=True, blank=True)
    check_out_time = models.DateTimeField(null=True, blank=True)

    check_in_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_in_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_out_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_out_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    minutes_late = models.PositiveIntegerField(null=True, blank=True)
    auto_marked_absent = models.BooleanField(default=False)

    # '', PENDING, APPROVED, REJECTED — mirrors the most recent
    # LateArrivalRequest's status for quick access without a join.
    late_request_status = models.CharField(max_length=10, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='late_arrivals_approved'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    approval_notes = models.TextField(blank=True)

    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-check_in_time']

    def __str__(self):
        return f"{self.shift_assignment} - {self.status}"


class LateArrivalRequest(BaseModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    attendance = models.ForeignKey(
        Attendance, on_delete=models.CASCADE, related_name='late_arrival_requests'
    )
    reason = models.CharField(max_length=255)
    explanation = models.TextField(blank=True)
    attachment = models.ImageField(upload_to='late_arrival_attachments/%Y/%m/', null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    minutes_late_at_submission = models.PositiveIntegerField()

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='late_arrival_reviews'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f"{self.attendance} - {self.status}"

# ---------------------------------------------------------------------------
# Appended by setup_notifications.py
# ---------------------------------------------------------------------------
class AttendanceNotification(BaseModel):
    class NotificationType(models.TextChoices):
        GRACE_PERIOD_ENDING = "GRACE_PERIOD_ENDING", "Grace Period Ending Soon"
        AUTO_ABSENT = "AUTO_ABSENT", "Automatically Marked Absent"
        LATE_REQUEST_SUBMITTED = "LATE_REQUEST_SUBMITTED", "Late Request Submitted"
        LATE_REQUEST_APPROVED = "LATE_REQUEST_APPROVED", "Late Request Approved"
        LATE_REQUEST_REJECTED = "LATE_REQUEST_REJECTED", "Late Request Rejected"
        NEW_LATE_REQUEST = "NEW_LATE_REQUEST", "New Late Arrival Request"
        PENDING_APPROVAL_REMINDER = "PENDING_APPROVAL_REMINDER", "Pending Approval Reminder"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="attendance_notifications"
    )
    notification_type = models.CharField(max_length=32, choices=NotificationType.choices)
    attendance = models.ForeignKey(
        "attendance.Attendance", on_delete=models.CASCADE, null=True, blank=True, related_name="notifications"
    )
    late_arrival_request = models.ForeignKey(
        "attendance.LateArrivalRequest", on_delete=models.CASCADE, null=True, blank=True, related_name="notifications"
    )
    message = models.TextField()
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.notification_type} -> {self.recipient}"
