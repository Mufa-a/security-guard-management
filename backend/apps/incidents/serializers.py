from rest_framework import serializers
from .models import Incident, IncidentAttachment


class IncidentAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncidentAttachment
        fields = ['id', 'incident', 'file', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']


class IncidentSerializer(serializers.ModelSerializer):
    site_name = serializers.CharField(source='site.name', read_only=True)
    reported_by_name = serializers.CharField(source='reported_by.user.email', read_only=True)
    attachments = IncidentAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Incident
        fields = [
            'id', 'site', 'site_name', 'shift_assignment', 'reported_by', 'reported_by_name',
            'category', 'severity', 'status', 'title', 'description', 'occurred_at',
            'attachments', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        request = self.context.get('request')
        employee_profile = None

        # Auto-assign reported_by to the logged-in user's EmployeeProfile, if not explicitly provided.
        if request and not validated_data.get('reported_by'):
            employee_profile = getattr(request.user, 'employee_profile', None)
            if employee_profile:
                validated_data['reported_by'] = employee_profile

        # Auto-derive site from the guard's current active SiteAssignment,
        # if neither site nor shift_assignment was explicitly provided.
        if not validated_data.get('site') and not validated_data.get('shift_assignment'):
            if employee_profile is None and request:
                employee_profile = getattr(request.user, 'employee_profile', None)

            if employee_profile:
                from apps.sites.models import SiteAssignment
                assignment = (
                    SiteAssignment.objects.filter(employee=employee_profile, is_active=True)
                    .order_by('-start_date')
                    .first()
                )
                if assignment:
                    validated_data['site'] = assignment.site

        return super().create(validated_data)