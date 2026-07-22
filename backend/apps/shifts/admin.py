from django.contrib import admin
from .models import Shift, ShiftAssignment


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ('site', 'date', 'shift_type', 'start_time', 'end_time', 'required_guards', 'is_active')
    list_filter = ('shift_type', 'is_active', 'site')
    search_fields = ('site__name',)
    date_hierarchy = 'date'


@admin.register(ShiftAssignment)
class ShiftAssignmentAdmin(admin.ModelAdmin):
    list_display = ('employee', 'shift', 'status', 'is_active')
    list_filter = ('status', 'is_active')
    search_fields = ('employee__user__email', 'shift__site__name')