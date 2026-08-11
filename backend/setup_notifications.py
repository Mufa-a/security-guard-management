"""
Run this from your backend/ directory (same folder as manage.py):

    python setup_notifications.py

What it does:
  - Backs up your existing mark_absences.py to mark_absences.py.bak,
    then replaces it with the version that adds the auto-absent
    notification (same .update() logic as before, otherwise untouched).
  - Creates attendance/notifications.py (new file).
  - Creates the two new management commands (new files).
  - Appends the AttendanceNotification model to attendance/models.py —
    but only if a class with that name isn't already in the file, so
    running this twice is safe and won't duplicate it.

It will NOT touch your views.py — see NOTIFICATIONS_SETUP.md for the
two snippets to add there by hand (that one needs your judgment on
exactly where the guard/employee variables are named, so it's not
safely automatable).
"""
import os

BASE = os.path.join("apps", "attendance")
COMMANDS_DIR = os.path.join(BASE, "management", "commands")


def write_file(path, content, allow_overwrite=True):
    exists = os.path.exists(path)
    if exists and not allow_overwrite:
        print(f"SKIP (already exists): {path}")
        return
    if exists:
        backup = path + ".bak"
        with open(path, "r", encoding="utf-8") as f:
            old_content = f.read()
        with open(backup, "w", encoding="utf-8") as f:
            f.write(old_content)
        print(f"Backed up existing file to: {backup}")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"{'Overwrote' if exists else 'Created'}: {path}")


def append_model_if_missing(models_path, model_source, marker="class AttendanceNotification"):
    if not os.path.exists(models_path):
        print(f"ERROR: {models_path} not found — skipping model append. Add it manually.")
        return
    with open(models_path, "r", encoding="utf-8") as f:
        existing = f.read()
    if marker in existing:
        print(f"SKIP: {marker} already present in {models_path}")
        return
    with open(models_path, "a", encoding="utf-8") as f:
        f.write("\n\n" + model_source)
    print(f"Appended {marker} to {models_path}")


NOTIFICATIONS_PY = '''"""
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
'''

NOTIFY_GRACE_PERIOD_PY = '''"""
Run frequently (every 1 minute recommended) alongside mark_absences.
See NOTIFICATIONS_SETUP.md for the cron/Celery beat schedule.

Notifies a guard once, when they're inside the last --lead-minutes
minutes of their grace period with no check-in yet. Uses a notification
existence check (scoped to attendance + type) so re-running this every
minute doesn't spam the guard -- only the first run inside the window
creates a row.
"""
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.attendance.constants import GRACE_PERIOD_MINUTES
from apps.attendance.models import Attendance, AttendanceNotification
from apps.attendance.notifications import notify, guard_user


class Command(BaseCommand):
    help = "Notifies guards whose grace period is about to end with no check-in."

    def add_arguments(self, parser):
        parser.add_argument(
            "--lead-minutes", type=int, default=5,
            help="How many minutes before grace period end to fire the warning (default: 5)",
        )
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        lead_minutes = options["lead_minutes"]
        dry_run = options["dry_run"]
        now = timezone.now()
        current_tz = timezone.get_current_timezone()

        candidates = Attendance.objects.filter(
            status=Attendance.Status.SCHEDULED,
            check_in_time__isnull=True,
            shift_assignment__shift__date=now.date(),
        ).exclude(
            shift_assignment__status__in=["CANCELLED", "NO_SHOW"],
        ).select_related(
            "shift_assignment__shift", "shift_assignment__employee__user",
        )

        notified = 0
        for att in candidates:
            shift = att.shift_assignment.shift
            naive_start = datetime.combine(shift.date, shift.start_time)
            shift_start = timezone.make_aware(naive_start, current_tz)
            grace_end = shift_start + timedelta(minutes=GRACE_PERIOD_MINUTES)
            warn_from = grace_end - timedelta(minutes=lead_minutes)

            if not (warn_from <= now < grace_end):
                continue

            already_sent = AttendanceNotification.objects.filter(
                attendance=att,
                notification_type=AttendanceNotification.NotificationType.GRACE_PERIOD_ENDING,
            ).exists()
            if already_sent:
                continue

            minutes_left = max(0, round((grace_end - now).total_seconds() / 60))

            if dry_run:
                self.stdout.write(f"[DRY RUN] Would notify {att.shift_assignment.employee} -- {minutes_left}m left in grace period")
                continue

            notify(
                guard_user(att),
                AttendanceNotification.NotificationType.GRACE_PERIOD_ENDING,
                message=f"Your grace period for {shift.site.name} ends in about {minutes_left} minute(s). Check in now.",
                attendance=att,
            )
            notified += 1

        if not dry_run:
            self.stdout.write(self.style.SUCCESS(f"Sent {notified} grace-period-ending notification(s)."))
'''

NOTIFY_PENDING_APPROVALS_PY = '''"""
Run periodically (every 15-30 minutes recommended). Unlike
notify_grace_period_ending, this one is allowed to re-fire -- a request
still sitting PENDING after --repeat-minutes since the last reminder
gets another one, so it doesn't just warn once and go silent.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from apps.attendance.models import LateArrivalRequest, AttendanceNotification
from apps.attendance.notifications import notify_supervisors


class Command(BaseCommand):
    help = "Reminds supervisors about late arrival requests still pending review."

    def add_arguments(self, parser):
        parser.add_argument(
            "--after-minutes", type=int, default=30,
            help="Minimum age (minutes) of a pending request before the first reminder (default: 30)",
        )
        parser.add_argument(
            "--repeat-minutes", type=int, default=60,
            help="Minimum gap (minutes) between repeat reminders for the same request (default: 60)",
        )
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        after_minutes = options["after_minutes"]
        repeat_minutes = options["repeat_minutes"]
        dry_run = options["dry_run"]
        now = timezone.now()

        pending = LateArrivalRequest.objects.filter(
            status=LateArrivalRequest.Status.PENDING,
            submitted_at__lte=now - timedelta(minutes=after_minutes),
        ).select_related(
            "attendance__shift_assignment__employee",
            "attendance__shift_assignment__shift__site",
        )

        reminded = 0
        for req in pending:
            last_reminder = AttendanceNotification.objects.filter(
                late_arrival_request=req,
                notification_type=AttendanceNotification.NotificationType.PENDING_APPROVAL_REMINDER,
            ).order_by("-created_at").first()

            if last_reminder and (now - last_reminder.created_at) < timedelta(minutes=repeat_minutes):
                continue

            guard = req.attendance.shift_assignment.employee
            site = req.attendance.shift_assignment.shift.site
            age_minutes = round((now - req.submitted_at).total_seconds() / 60)

            if dry_run:
                self.stdout.write(f"[DRY RUN] Would remind supervisors -- {guard} at {site.name}, pending {age_minutes}m")
                continue

            notify_supervisors(
                AttendanceNotification.NotificationType.PENDING_APPROVAL_REMINDER,
                message=f"Late arrival request from {guard} at {site.name} has been pending {age_minutes} minute(s).",
                late_arrival_request=req,
                attendance=req.attendance,
            )
            reminded += 1

        if not dry_run:
            self.stdout.write(self.style.SUCCESS(f"Sent reminders for {reminded} pending request(s)."))
'''

MARK_ABSENCES_PY = '''from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.attendance.constants import LATE_THRESHOLD_MINUTES
from apps.attendance.models import Attendance, AttendanceNotification
from apps.attendance.notifications import notify, guard_user


class Command(BaseCommand):
    help = (
        "Scans Attendance records still SCHEDULED with no check-in where the "
        "shift start (date + start_time) has passed the absence threshold, "
        "and marks them ABSENT."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--minutes", type=int, default=LATE_THRESHOLD_MINUTES,
            help=f"Minutes after shift start before marking absent (default: {LATE_THRESHOLD_MINUTES}, from apps.attendance.constants)",
        )
        parser.add_argument("--dry-run", action="store_true", help="Preview without saving changes")

    def handle(self, *args, **options):
        threshold_minutes = options["minutes"]
        dry_run = options["dry_run"]
        now = timezone.now()
        current_tz = timezone.get_current_timezone()

        candidates = Attendance.objects.filter(
            status=Attendance.Status.SCHEDULED,
            check_in_time__isnull=True,
            shift_assignment__shift__date__lte=now.date(),
        ).exclude(
            shift_assignment__status__in=["CANCELLED", "NO_SHOW"],
        ).select_related(
            "shift_assignment__shift", "shift_assignment__employee__user",
        )

        to_mark = []  # (attendance, employee, shift, shift_start)

        for att in candidates:
            shift = att.shift_assignment.shift
            naive_start = datetime.combine(shift.date, shift.start_time)
            shift_start = timezone.make_aware(naive_start, current_tz)
            cutoff = shift_start + timedelta(minutes=threshold_minutes)

            if now >= cutoff:
                to_mark.append((att, att.shift_assignment.employee, shift, shift_start))

        if not to_mark:
            self.stdout.write(self.style.SUCCESS("No stale attendance records found."))
            return

        if dry_run:
            self.stdout.write(self.style.WARNING(f"[DRY RUN] Would mark {len(to_mark)} record(s) as ABSENT and notify:"))
            for att, employee, shift, shift_start in to_mark:
                self.stdout.write(f"  - {employee} / {shift} (started {shift_start})")
            return

        to_mark_ids = [att.id for att, _, _, _ in to_mark]
        updated = Attendance.objects.filter(id__in=to_mark_ids).update(
            status=Attendance.Status.ABSENT, auto_marked_absent=True,
        )

        # .update() above is a bulk SQL UPDATE and doesn't reload the
        # in-memory `att` objects, but we don't need their post-update
        # state here -- the notification only needs the guard identity and
        # shift context, both of which are unchanged by this update.
        for att, employee, shift, shift_start in to_mark:
            notify(
                guard_user(att),
                AttendanceNotification.NotificationType.AUTO_ABSENT,
                message=f"You were automatically marked absent for your {shift_start.strftime('%H:%M')} shift at {shift.site.name}. Submit a late arrival request if you have a reason.",
                attendance=att,
            )

        self.stdout.write(
            self.style.SUCCESS(f"Marked {updated} attendance record(s) as ABSENT (threshold: {threshold_minutes} min) and sent {len(to_mark)} notification(s).")
        )
'''

NOTIFICATION_MODEL = '''# ---------------------------------------------------------------------------
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
'''


def main():
    if not os.path.isdir(BASE):
        print(f"ERROR: {BASE} not found. Run this script from your backend/ directory (same folder as manage.py).")
        return

    write_file(os.path.join(BASE, "notifications.py"), NOTIFICATIONS_PY)
    write_file(os.path.join(COMMANDS_DIR, "notify_grace_period_ending.py"), NOTIFY_GRACE_PERIOD_PY)
    write_file(os.path.join(COMMANDS_DIR, "notify_pending_approvals.py"), NOTIFY_PENDING_APPROVALS_PY)
    write_file(os.path.join(COMMANDS_DIR, "mark_absences.py"), MARK_ABSENCES_PY)  # backs up the existing one first
    append_model_if_missing(os.path.join(BASE, "models.py"), NOTIFICATION_MODEL)

    print("\nDone. Next steps:")
    print("  1. python manage.py makemigrations attendance")
    print("  2. python manage.py migrate")
    print("  3. Add the two views.py snippets from NOTIFICATIONS_SETUP.md by hand")
    print("  4. Test: python manage.py mark_absences --dry-run")


if __name__ == "__main__":
    main()