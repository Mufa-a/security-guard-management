from rest_framework import viewsets
from apps.core.permissions import CanReportIncidentOrSupervisor
from .models import Incident, IncidentAttachment
from .serializers import IncidentSerializer, IncidentAttachmentSerializer


class IncidentViewSet(viewsets.ModelViewSet):
    serializer_class = IncidentSerializer
    permission_classes = [CanReportIncidentOrSupervisor]

    def get_queryset(self):
        qs = Incident.objects.select_related(
            'site', 'reported_by__user', 'shift_assignment'
        ).prefetch_related('attachments').all()
        user = self.request.user
        if user.role.name == 'GUARD':
            return qs.filter(reported_by__user=user)
        return qs

    def get_serializer_context(self):
        return {'request': self.request}


class IncidentAttachmentViewSet(viewsets.ModelViewSet):
    queryset = IncidentAttachment.objects.select_related('incident').all()
    serializer_class = IncidentAttachmentSerializer
    permission_classes = [CanReportIncidentOrSupervisor]