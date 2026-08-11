"""
Smart shift planning logic: conflict detection, working-hour caps,
guard suggestions, and weekly copy/repeat of rosters.

Kept separate from views.py so it can be unit tested without spinning up
the DRF request/response cycle, and reused from management commands or
Celery tasks later if scheduling gets automated further.
"""
from datetime import datetime, timedelta, date as date_cls
from decimal import Decimal

from django.db.models import Q

from .models import Shift, ShiftAssignment

DAILY_HOUR_CAP = Decimal('12')
WEEKLY_HOUR_CAP = Decimal('48')

# Statuses that represent a guard actually being on the roster for a shift.
# CANCELLED/NO_SHOW assignments shouldn't count against conflicts or hour caps.
ACTIVE_ASSIGNMENT_STATUSES = (
    ShiftAssignment.Status.ASSIGNED,
    ShiftAssignment.Status.CONFIRMED,
    ShiftAssignment.Status.COMPLETED,
)


def shift_datetime_range(shift: Shift) -> tuple[datetime, datetime]:
    """
    Resolve a Shift's actual start/end datetimes, correctly handling
    overnight shifts (end_time <= start_time means it rolls into the next day).
    """
    start_dt = datetime.combine(shift.date, shift.start_time)
    end_dt = datetime.combine(shift.date, shift.end_time)
    if shift.end_time <= shift.start_time:
        end_dt += timedelta(days=1)
    return start_dt, end_dt


def shift_duration_hours(shift: Shift) -> Decimal:
    start_dt, end_dt = shift_datetime_range(shift)
    seconds = (end_dt - start_dt).total_seconds()
    return (Decimal(seconds) / Decimal(3600)).quantize(Decimal('0.01'))


def _ranges_overlap(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
    return a_start < b_end and b_start < a_end


def get_conflicting_assignments(employee, shift: Shift, exclude_assignment_id=None):
    """
    Return existing active ShiftAssignments for `employee` whose shift
    time range overlaps with `shift`. Looks at a +/-1 day window around
    the target shift's date since overnight shifts can spill into the
    next calendar day.
    """
    start_dt, end_dt = shift_datetime_range(shift)
    window_start = shift.date - timedelta(days=1)
    window_end = shift.date + timedelta(days=1)

    candidates = ShiftAssignment.objects.select_related('shift').filter(
        employee=employee,
        status__in=ACTIVE_ASSIGNMENT_STATUSES,
        shift__date__gte=window_start,
        shift__date__lte=window_end,
    ).exclude(shift_id=shift.id)

    if exclude_assignment_id:
        candidates = candidates.exclude(id=exclude_assignment_id)

    conflicts = []
    for assignment in candidates:
        other_start, other_end = shift_datetime_range(assignment.shift)
        if _ranges_overlap(start_dt, end_dt, other_start, other_end):
            conflicts.append(assignment)
    return conflicts


def get_employee_hours(employee, start_date: date_cls, end_date: date_cls, exclude_assignment_id=None) -> Decimal:
    """Total scheduled hours for `employee` across shifts dated within [start_date, end_date]."""
    qs = ShiftAssignment.objects.select_related('shift').filter(
        employee=employee,
        status__in=ACTIVE_ASSIGNMENT_STATUSES,
        shift__date__gte=start_date,
        shift__date__lte=end_date,
    )
    if exclude_assignment_id:
        qs = qs.exclude(id=exclude_assignment_id)
    total = Decimal('0')
    for assignment in qs:
        total += shift_duration_hours(assignment.shift)
    return total


def check_hour_limits(employee, shift: Shift, exclude_assignment_id=None) -> dict:
    """
    Returns a dict describing whether assigning `employee` to `shift` would
    breach the daily or weekly hour cap. Does not block anything itself —
    callers decide whether a warning should stop the assignment or just be shown.
    """
    this_shift_hours = shift_duration_hours(shift)

    daily_existing = get_employee_hours(employee, shift.date, shift.date, exclude_assignment_id)
    daily_total = daily_existing + this_shift_hours

    week_start = shift.date - timedelta(days=shift.date.weekday())  # Monday
    week_end = week_start + timedelta(days=6)
    weekly_existing = get_employee_hours(employee, week_start, week_end, exclude_assignment_id)
    weekly_total = weekly_existing + this_shift_hours

    return {
        'daily_hours': float(daily_total),
        'daily_cap': float(DAILY_HOUR_CAP),
        'exceeds_daily_cap': daily_total > DAILY_HOUR_CAP,
        'weekly_hours': float(weekly_total),
        'weekly_cap': float(WEEKLY_HOUR_CAP),
        'exceeds_weekly_cap': weekly_total > WEEKLY_HOUR_CAP,
    }


def suggest_guards_for_shift(shift: Shift, limit: int = 10) -> list[dict]:
    """
    Candidate guards for `shift`, ranked with the cleanest options first:
    1. Actively posted to the shift's site, no conflict, no hour-cap breach
    2. Not posted to this site but otherwise free
    3. Anyone with a conflict or hour-cap breach, flagged
    Guards outside the site roster or over a cap are still included (so a
    manager can override) but flagged and sorted after clean candidates.
    """
    from apps.sites.models import SiteAssignment
    from apps.staff.models import EmployeeProfile

    site_guard_ids = set(SiteAssignment.objects.filter(
        site=shift.site, is_active=True
    ).values_list('employee_id', flat=True))

    already_assigned_ids = ShiftAssignment.objects.filter(
        shift=shift, status__in=ACTIVE_ASSIGNMENT_STATUSES
    ).values_list('employee_id', flat=True)

    candidates = EmployeeProfile.objects.filter(
        user__role__name='GUARD',
        employment_status=EmployeeProfile.EmploymentStatus.ACTIVE,
    ).exclude(id__in=already_assigned_ids).select_related('user')

    results = []
    for employee in candidates:
        conflicts = get_conflicting_assignments(employee, shift)
        hour_check = check_hour_limits(employee, shift)
        posted_to_site = employee.id in site_guard_ids
        available = not conflicts and not hour_check['exceeds_daily_cap'] and not hour_check['exceeds_weekly_cap']
        results.append({
            'employee_id': employee.id,
            'employee_name': f'{employee.user.first_name} {employee.user.last_name}'.strip(),
            'available': available,
            'posted_to_site': posted_to_site,
            'has_conflict': bool(conflicts),
            'conflicting_shifts': [
                {'shift_id': c.shift_id, 'date': c.shift.date.isoformat(), 'site': c.shift.site.name}
                for c in conflicts
            ],
            'exceeds_daily_cap': hour_check['exceeds_daily_cap'],
            'exceeds_weekly_cap': hour_check['exceeds_weekly_cap'],
            'current_weekly_hours': hour_check['weekly_hours'],
        })

    # Best first: posted to site + available, then available elsewhere, then flagged ones last.
    results.sort(key=lambda r: (not r['posted_to_site'], not r['available']))
    return results[:limit]


def copy_week(source_week_start: date_cls, target_week_start: date_cls, site=None, include_assignments=True):
    """
    Clone all shifts (and optionally their assignments) from the 7-day window
    starting at source_week_start into the 7-day window starting at
    target_week_start. Skips a shift if an identical one (same site, date,
    start_time, shift_type) already exists on the target date, and skips an
    individual assignment if the guard would conflict on the new date —
    both cases are reported back rather than silently dropped or blocking
    the whole copy.
    """
    day_offset = (target_week_start - source_week_start).days
    source_week_end = source_week_start + timedelta(days=6)

    source_shifts = Shift.objects.filter(date__gte=source_week_start, date__lte=source_week_end)
    if site:
        source_shifts = source_shifts.filter(site=site)

    created_shifts = []
    skipped_shifts = []
    skipped_assignments = []

    for source_shift in source_shifts.select_related('site').prefetch_related('assignments__employee__user'):
        new_date = source_shift.date + timedelta(days=day_offset)
        exists = Shift.objects.filter(
            site=source_shift.site, date=new_date,
            start_time=source_shift.start_time, shift_type=source_shift.shift_type,
        ).exists()
        if exists:
            skipped_shifts.append({
                'site': source_shift.site.name, 'date': new_date.isoformat(),
                'reason': 'A matching shift already exists on this date.',
            })
            continue

        new_shift = Shift.objects.create(
            site=source_shift.site,
            shift_type=source_shift.shift_type,
            date=new_date,
            start_time=source_shift.start_time,
            end_time=source_shift.end_time,
            required_guards=source_shift.required_guards,
            notes=source_shift.notes,
        )
        created_shifts.append(new_shift)

        if include_assignments:
            for assignment in source_shift.assignments.filter(status__in=ACTIVE_ASSIGNMENT_STATUSES):
                conflicts = get_conflicting_assignments(assignment.employee, new_shift)
                if conflicts:
                    skipped_assignments.append({
                        'employee': assignment.employee.user.email,
                        'date': new_date.isoformat(),
                        'reason': 'Guard already has a conflicting shift on this date.',
                    })
                    continue
                ShiftAssignment.objects.create(
                    shift=new_shift, employee=assignment.employee,
                    status=ShiftAssignment.Status.ASSIGNED,
                )

    return {
        'created_shifts': len(created_shifts),
        'shift_ids': [s.id for s in created_shifts],
        'skipped_shifts': skipped_shifts,
        'skipped_assignments': skipped_assignments,
    }


def repeat_weekly(shift_ids: list, weeks: int, include_assignments=True):
    """
    Take an existing set of shifts (e.g. "this week's roster for Site X")
    and repeat them forward `weeks` times, 7 days apart each iteration.
    Internally just calls copy_week week-by-week so the same conflict/skip
    reporting applies.
    """
    shifts = list(Shift.objects.filter(id__in=shift_ids).select_related('site'))
    if not shifts:
        return {'created_shifts': 0, 'shift_ids': [], 'skipped_shifts': [], 'skipped_assignments': []}

    base_week_start = min(s.date for s in shifts)
    base_week_start -= timedelta(days=base_week_start.weekday())  # normalize to Monday

    totals = {'created_shifts': 0, 'shift_ids': [], 'skipped_shifts': [], 'skipped_assignments': []}
    for week_num in range(1, weeks + 1):
        target_week_start = base_week_start + timedelta(days=7 * week_num)
        # Restrict the "source" to just the given shift ids by filtering
        # per-site in copy_week would over-copy, so instead we inline a
        # narrower version here.
        day_offset = 7 * week_num
        for source_shift in shifts:
            new_date = source_shift.date + timedelta(days=day_offset)
            exists = Shift.objects.filter(
                site=source_shift.site, date=new_date,
                start_time=source_shift.start_time, shift_type=source_shift.shift_type,
            ).exists()
            if exists:
                totals['skipped_shifts'].append({
                    'site': source_shift.site.name, 'date': new_date.isoformat(),
                    'reason': 'A matching shift already exists on this date.',
                })
                continue
            new_shift = Shift.objects.create(
                site=source_shift.site,
                shift_type=source_shift.shift_type,
                date=new_date,
                start_time=source_shift.start_time,
                end_time=source_shift.end_time,
                required_guards=source_shift.required_guards,
                notes=source_shift.notes,
            )
            totals['created_shifts'] += 1
            totals['shift_ids'].append(new_shift.id)

            if include_assignments:
                for assignment in source_shift.assignments.filter(status__in=ACTIVE_ASSIGNMENT_STATUSES):
                    conflicts = get_conflicting_assignments(assignment.employee, new_shift)
                    if conflicts:
                        totals['skipped_assignments'].append({
                            'employee': assignment.employee.user.email,
                            'date': new_date.isoformat(),
                            'reason': 'Guard already has a conflicting shift on this date.',
                        })
                        continue
                    ShiftAssignment.objects.create(
                        shift=new_shift, employee=assignment.employee,
                        status=ShiftAssignment.Status.ASSIGNED,
                    )
    return totals