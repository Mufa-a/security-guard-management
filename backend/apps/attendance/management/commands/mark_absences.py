from datetime import datetime, timedelta

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

        to_mark = []  # (attendance, employee, shift, shift_start, minutes_late)

        for att in candidates:
            shift = att.shift_assignment.shift
            naive_start = datetime.combine(shift.date, shift.start_time)
            shift_start = timezone.make_aware(naive_start, current_tz)
            cutoff = shift_start + timedelta(minutes=threshold_minutes)

            if now >= cutoff:
                minutes_late = round((now - shift_start).total_seconds() / 60)
                to_mark.append((att, att.shift_assignment.employee, shift, shift_start, minutes_late))

        if not to_mark:
            self.stdout.write(self.style.SUCCESS("No stale attendance records found."))
            return

        if dry_run:
            self.stdout.write(self.style.WARNING(f"[DRY RUN] Would mark {len(to_mark)} record(s) as ABSENT and notify:"))
            for att, employee, shift, shift_start, minutes_late in to_mark:
                self.stdout.write(f"  - {employee} / {shift} (started {shift_start}, {minutes_late}m late)")
            return

        # bulk_update (not a bulk .update() queryset call) so each row can
        # get its own minutes_late value in one query, instead of every
        # matched row being forced to the same value. Note: like .update(),
        # bulk_update() still bypasses save()/signals -- if you've wired up
        # AttendanceAuditLog signals, these auto-absence events still won't
        # appear there. Switch to a per-object .save() loop instead if the
        # audit trail needs to include auto-absences; that's a deliberate
        # trade-off left as-is here since fixing minutes_late doesn't
        # require it.
        for att, employee, shift, shift_start, minutes_late in to_mark:
            att.status = Attendance.Status.ABSENT
            att.auto_marked_absent = True
            att.minutes_late = minutes_late

        Attendance.objects.bulk_update(
            [att for att, *_ in to_mark], ["status", "auto_marked_absent", "minutes_late"]
        )

        for att, employee, shift, shift_start, minutes_late in to_mark:
            notify(
                guard_user(att),
                AttendanceNotification.NotificationType.AUTO_ABSENT,
                message=f"You were automatically marked absent for your {shift_start.strftime('%H:%M')} shift at {shift.site.name}. Submit a late arrival request if you have a reason.",
                attendance=att,
            )

        self.stdout.write(
            self.style.SUCCESS(f"Marked {len(to_mark)} attendance record(s) as ABSENT (threshold: {threshold_minutes} min) and sent {len(to_mark)} notification(s).")
        )