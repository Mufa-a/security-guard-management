from rest_framework import serializers
from .models import Incident, IncidentAttachment, IncidentActivity, Witness, IncidentPerson


class IncidentAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.user.email', read_only=True)

    class Meta:
        model = IncidentAttachment
        fields = ['id', 'incident', 'file', 'description', 'uploaded_by', 'uploaded_by_name', 'created_at']
        read_only_fields = ['id', 'uploaded_by', 'created_at']

    def create(self, validated_data):
        request = self.context.get('request')
        if request:
            employee_profile = getattr(request.user, 'employee_profile', None)
            if employee_profile:
                validated_data['uploaded_by'] = employee_profile
        instance = super().create(validated_data)
        IncidentActivity.objects.create(
            incident=instance.incident,
            actor=validated_data.get('uploaded_by'),
            activity_type=IncidentActivity.ActivityType.EVIDENCE_ADDED,
            note=instance.description or instance.file.name,
        )
        return instance


class IncidentActivitySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.user.email', read_only=True)

    class Meta:
        model = IncidentActivity
        fields = ['id', 'incident', 'actor', 'actor_name', 'activity_type', 'note', 'created_at']
        read_only_fields = ['id', 'actor', 'activity_type', 'created_at']


class WitnessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Witness
        fields = ['id', 'incident', 'name', 'phone', 'statement', 'created_at']
        read_only_fields = ['id', 'created_at']


class IncidentPersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncidentPerson
        fields = ['id', 'incident', 'role', 'name', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']


class IncidentSerializer(serializers.ModelSerializer):
    site_name = serializers.CharField(source='site.name', read_only=True)
    reported_by_name = serializers.CharField(source='reported_by.user.email', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.user.email', read_only=True)
    attachments = IncidentAttachmentSerializer(many=True, read_only=True)
    activities = IncidentActivitySerializer(many=True, read_only=True)
    witnesses = WitnessSerializer(many=True, read_only=True)
    people_involved = IncidentPersonSerializer(many=True, read_only=True)

    class Meta:
        model = Incident
        fields = [
            'id', 'incident_number', 'site', 'site_name', 'shift_assignment',
            'reported_by', 'reported_by_name', 'assigned_to', 'assigned_to_name',
            'category', 'severity', 'status', 'title', 'description', 'occurred_at',
            'latitude', 'longitude',
            'attachments', 'activities', 'witnesses', 'people_involved',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'incident_number', 'created_at', 'updated_at']

    def create(self, validated_data):
        request = self.context.get('request')
        employee_profile = None

        if request and not validated_data.get('reported_by'):
            employee_profile = getattr(request.user, 'employee_profile', None)
            if employee_profile:
                validated_data['reported_by'] = employee_profile

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

        instance = super().create(validated_data)
        IncidentActivity.objects.create(
            incident=instance,
            actor=validated_data.get('reported_by'),
            activity_type=IncidentActivity.ActivityType.CREATED,
            note=f"Incident reported: {instance.title}",
        )
        return instance

    def update(self, instance, validated_data):
        request = self.context.get('request')
        actor = None
        if request:
            actor = getattr(request.user, 'employee_profile', None)

        old_status = instance.status
        old_assigned = instance.assigned_to_id

        instance = super().update(instance, validated_data)

        if 'status' in validated_data and validated_data['status'] != old_status:
            IncidentActivity.objects.create(
                incident=instance, actor=actor,
                activity_type=IncidentActivity.ActivityType.STATUS_CHANGED,
                note=f"Status changed from {old_status} to {instance.status}",
            )
        if 'assigned_to' in validated_data and validated_data['assigned_to'] and validated_data['assigned_to'].id != old_assigned:
            IncidentActivity.objects.create(
                incident=instance, actor=actor,
                activity_type=IncidentActivity.ActivityType.ASSIGNED,
                note=f"Assigned to {instance.assigned_to.user.email}",
            )
        return instance