from rest_framework import serializers
from .models import Attendance


class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='shift_assignment.employee.user.email', read_only=True)
    site_name = serializers.CharField(source='shift_assignment.shift.site.name', read_only=True)
    shift_date = serializers.DateField(source='shift_assignment.shift.date', read_only=True)

    class Meta:
        model = Attendance
        fields = [
            'id', 'shift_assignment', 'employee_name', 'site_name', 'shift_date',
            'status', 'check_in_time', 'check_out_time',
            'check_in_latitude', 'check_in_longitude',
            'check_out_latitude', 'check_out_longitude',
            'notes', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
class CheckInOutSerializer(serializers.Serializer):
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)