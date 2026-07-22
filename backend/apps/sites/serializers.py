from rest_framework import serializers
from .models import Client, Site, SiteAssignment


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = [
            'id', 'name', 'contact_person', 'contact_email',
            'contact_phone', 'address', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SiteSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)

    class Meta:
        model = Site
        fields = [
            'id', 'client', 'client_name', 'name', 'address',
            'latitude', 'longitude', 'site_manager_contact',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SiteAssignmentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.email', read_only=True)
    site_name = serializers.CharField(source='site.name', read_only=True)

    class Meta:
        model = SiteAssignment
        fields = [
            'id', 'site', 'site_name', 'employee', 'employee_name',
            'start_date', 'end_date', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']