"""
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
