from rest_framework import serializers
from apps.accounts.serializers import UserSerializer
from .models import EmployeeProfile, EmployeeDocument


class EmployeeDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeDocument
        fields = [
            "id", "employee", "document_type", "file",
            "issue_date", "expiry_date", "notes", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class EmployeeProfileCreateSerializer(serializers.ModelSerializer):
    """
    Used when creating a profile — takes user id instead of nested user object.

    employee_number is always optional at the serializer level and
    auto-generated if not supplied: GRD-001, GRD-002... for GUARD accounts,
    STF-001, STF-002... for everyone else (SUPERVISOR/MANAGER/ADMIN).
    """

    employee_number = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = EmployeeProfile
        fields = [
            "user", "employee_number", "national_id", "date_of_birth", "gender",
            "physical_address", "next_of_kin_name", "next_of_kin_phone",
            "date_employed", "employment_status", "height_cm", "photo",
        ]

    def validate_national_id(self, value):
        if not value.isdigit() or not (7 <= len(value) <= 9):
            raise serializers.ValidationError("National ID must be between 7 and 9 digits.")
        return value

    def validate_next_of_kin_phone(self, value):
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError("Next of kin phone must be exactly 10 digits.")
        return value

    def _generate_employee_number(self, prefix):
        last = (
            EmployeeProfile.objects.filter(employee_number__startswith=f'{prefix}-')
            .order_by('-employee_number')
            .first()
        )
        next_num = 1
        if last:
            try:
                next_num = int(last.employee_number.split('-')[1]) + 1
            except (IndexError, ValueError):
                next_num = 1
        return f'{prefix}-{next_num:03d}'

    def create(self, validated_data):
        if not validated_data.get('employee_number'):
            user = validated_data.get('user')
            role_name = getattr(getattr(user, 'role', None), 'name', None)
            prefix = 'GRD' if role_name == 'GUARD' else 'STF'
            validated_data['employee_number'] = self._generate_employee_number(prefix)
        return super().create(validated_data)

class EmployeeProfileCreateSerializer(serializers.ModelSerializer):
    """
    Used when creating a profile — takes user id instead of nested user object.

    employee_number is optional at the serializer level: for GUARD accounts
    it's auto-generated (GRD-001, GRD-002, ...); for every other role it's
    still required, entered manually.
    """

    employee_number = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = EmployeeProfile
        fields = [
            "user", "employee_number", "national_id", "date_of_birth", "gender",
            "physical_address", "next_of_kin_name", "next_of_kin_phone",
            "date_employed", "employment_status", "height_cm", "photo",
        ]

    def validate_national_id(self, value):
        if not value.isdigit() or not (7 <= len(value) <= 9):
            raise serializers.ValidationError("National ID must be between 7 and 9 digits.")
        return value

    def validate_next_of_kin_phone(self, value):
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError("Next of kin phone must be exactly 10 digits.")
        return value

    def validate(self, data):
        user = data.get('user')
        role_name = getattr(getattr(user, 'role', None), 'name', None)
        if role_name != 'GUARD' and not data.get('employee_number'):
            raise serializers.ValidationError(
                {'employee_number': 'Employee number is required for this role.'}
            )
        return data

    def _generate_guard_number(self):
        last = (
            EmployeeProfile.objects.filter(employee_number__startswith='GRD-')
            .order_by('-employee_number')
            .first()
        )
        next_num = 1
        if last:
            try:
                next_num = int(last.employee_number.split('-')[1]) + 1
            except (IndexError, ValueError):
                next_num = 1
        return f'GRD-{next_num:03d}'

    def create(self, validated_data):
        user = validated_data.get('user')
        role_name = getattr(getattr(user, 'role', None), 'name', None)
        if role_name == 'GUARD' and not validated_data.get('employee_number'):
            validated_data['employee_number'] = self._generate_guard_number()
        return super().create(validated_data)