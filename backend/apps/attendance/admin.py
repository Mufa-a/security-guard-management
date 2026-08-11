from django.contrib import admin
from .models import Attendance, AttendanceNotification


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


@admin.register(AttendanceNotification)
class AttendanceNotificationAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'notification_type', 'attendance', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read')
    search_fields = ('recipient__email', 'message')
    readonly_fields = ('recipient', 'notification_type', 'attendance', 'late_arrival_request', 'message', 'created_at')