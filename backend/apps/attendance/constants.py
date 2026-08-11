# Keep these two numbers in sync with:
#  - frontend/src/api/dashboardApi.ts (LATE_GRACE_MINUTES / ABSENT_GRACE_MINUTES)
#  - the --minutes default in apps/attendance/management/commands/mark_absences.py

GRACE_PERIOD_MINUTES = 15    # 0–15 min after shift start: on time, Status.PRESENT
LATE_THRESHOLD_MINUTES = 60  # 15–60 min: Status.PRESENT_LATE; 60+: auto Status.ABSENT