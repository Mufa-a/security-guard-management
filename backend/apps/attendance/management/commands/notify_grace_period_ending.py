"""
Run frequently (every 1 minute recommended) alongside mark_absences.
See NOTIFICATIONS_SETUP.md for the cron/Celery beat schedule.

Notifies a guard once, when they're inside the last `--lead-minutes`
minutes of their grace period with no check-in yet. Uses get_or_create
on the notification itself (scoped to attendance + type) so re-running
this every minute doesn't spam the guard — only the first run inside
the window creates a row.
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
        dry_run_matches = 0
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
                self.stdout.write(f"[DRY RUN] Would notify {att.shift_assignment.employee} — {minutes_left}m left in grace period")
                dry_run_matches += 1
                continue

            notify(
                guard_user(att),
                AttendanceNotification.NotificationType.GRACE_PERIOD_ENDING,
                message=f"Your grace period for {shift.site.name} ends in about {minutes_left} minute(s). Check in now.",
                attendance=att,
            )
            notified += 1

        if dry_run and dry_run_matches == 0:
            # Nothing printed above means zero candidates matched at all —
            # make that explicit instead of silent blank output.
            self.stdout.write(self.style.SUCCESS("[DRY RUN] No candidates in the grace-period-ending window."))
        if not dry_run:
            self.stdout.write(self.style.SUCCESS(f"Sent {notified} grace-period-ending notification(s)."))