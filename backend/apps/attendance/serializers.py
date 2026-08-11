from rest_framework import serializers
from .models import Attendance, LateArrivalRequest


class LateArrivalRequestSerializer(serializers.ModelSerializer):
    reviewed_by_name = serializers.CharField(source='reviewed_by.email', read_only=True)
    guard_name = serializers.CharField(source='attendance.shift_assignment.employee.user.email', read_only=True)
    site_name = serializers.CharField(source='attendance.shift_assignment.shift.site.name', read_only=True)
    shift_date = serializers.DateField(source='attendance.shift_assignment.shift.date', read_only=True)
    shift_start_time = serializers.TimeField(source='attendance.shift_assignment.shift.start_time', read_only=True)

    class Meta:
        model = LateArrivalRequest
        fields = [
            'id', 'attendance', 'reason', 'explanation', 'attachment',
            'latitude', 'longitude', 'submitted_at', 'minutes_late_at_submission',
            'status', 'reviewed_by', 'reviewed_by_name', 'reviewed_at', 'review_notes',
            'guard_name', 'site_name', 'shift_date', 'shift_start_time',
        ]
        read_only_fields = [
            'id', 'submitted_at', 'status',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at', 'review_notes',
        ]


class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='shift_assignment.employee.user.email', read_only=True)
    site_name = serializers.CharField(source='shift_assignment.shift.site.name', read_only=True)
    shift_date = serializers.DateField(source='shift_assignment.shift.date', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.email', read_only=True)
    late_arrival_requests = LateArrivalRequestSerializer(many=True, read_only=True)

    class Meta:
        model = Attendance
        fields = [
            'id', 'shift_assignment', 'employee_name', 'site_name', 'shift_date',
            'status', 'check_in_time', 'check_out_time',
            'check_in_latitude', 'check_in_longitude',
            'check_out_latitude', 'check_out_longitude',
            'minutes_late', 'auto_marked_absent',
            'late_request_status', 'approved_by', 'approved_by_name',
            'approved_at', 'approval_notes',
            'late_arrival_requests',
            'notes', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'minutes_late', 'auto_marked_absent',
            'late_request_status', 'approved_by', 'approved_by_name',
            'approved_at', 'approval_notes',
        ]


class CheckInOutSerializer(serializers.Serializer):
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)

# --- Appended by setup_notification_api.py ---
from .models import AttendanceNotification as _AttendanceNotification


class AttendanceNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = _AttendanceNotification
        fields = [
            'id', 'notification_type', 'attendance', 'late_arrival_request',
            'message', 'is_read', 'created_at',
        ]
        read_only_fields = fields
