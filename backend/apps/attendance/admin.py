from django.contrib import admin
from .models import Attendance


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = (
        'shift_assignment', 'status', 'check_in_time', 'check_out_time', 'is_active',
    )
    list_filter = ('status', 'is_active')
    search_fields = (
        'shift_assignment__employee__user__email',
        'shift_assignment__shift__site__name',
    )