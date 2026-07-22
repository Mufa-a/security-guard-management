from rest_framework import serializers
from .models import Shift, ShiftAssignment


class ShiftSerializer(serializers.ModelSerializer):
    site_name = serializers.CharField(source='site.name', read_only=True)

    class Meta:
        model = Shift
        fields = [
            'id', 'site', 'site_name', 'shift_type', 'date',
            'start_time', 'end_time', 'required_guards', 'notes',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ShiftAssignmentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.email', read_only=True)
    shift_detail = serializers.CharField(source='shift.__str__', read_only=True)
    site_name = serializers.CharField(source='shift.site.name', read_only=True)
    shift_date = serializers.DateField(source='shift.date', read_only=True)
    shift_start_time = serializers.TimeField(source='shift.start_time', read_only=True)
    shift_end_time = serializers.TimeField(source='shift.end_time', read_only=True)

    class Meta:
        model = ShiftAssignment
        fields = [
            'id', 'shift', 'shift_detail', 'site_name', 'shift_date',
            'shift_start_time', 'shift_end_time',
            'employee', 'employee_name', 'status', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']