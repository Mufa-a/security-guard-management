from django.http import FileResponse, Http404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.core.permissions import CanReportIncidentOrSupervisor
from .models import Incident, IncidentAttachment, IncidentActivity, Witness, IncidentPerson
from .serializers import (
    IncidentSerializer, IncidentAttachmentSerializer, IncidentActivitySerializer,
    WitnessSerializer, IncidentPersonSerializer,
)


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

    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        incident = self.get_object()
        note = (request.data.get('note') or '').strip()
        if not note:
            return Response({'note': 'This field is required.'}, status=status.HTTP_400_BAD_REQUEST)

        actor = getattr(request.user, 'employee_profile', None)
        activity = IncidentActivity.objects.create(
            incident=incident,
            actor=actor,
            activity_type=IncidentActivity.ActivityType.COMMENT,
            note=note,
        )
        serializer = IncidentActivitySerializer(activity, context=self.get_serializer_context())
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class IncidentAttachmentViewSet(viewsets.ModelViewSet):
    serializer_class = IncidentAttachmentSerializer
    permission_classes = [CanReportIncidentOrSupervisor]

    def get_queryset(self):
        qs = IncidentAttachment.objects.select_related('incident').all()
        user = self.request.user
        if user.role.name == 'GUARD':
            return qs.filter(incident__reported_by__user=user)
        return qs

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        # get_object() re-applies get_queryset() scoping and
        # CanReportIncidentOrSupervisor.has_object_permission, so a guard
        # requesting another incident's attachment gets a 404, not the file.
        attachment = self.get_object()  # requires the has_object_permission fix below
        if not attachment.file:
            raise Http404
        filename = attachment.file.name.rsplit('/', 1)[-1]
        return FileResponse(attachment.file.open('rb'), as_attachment=False, filename=filename)

class WitnessViewSet(viewsets.ModelViewSet):
    serializer_class = WitnessSerializer
    permission_classes = [CanReportIncidentOrSupervisor]

    def get_queryset(self):
        qs = Witness.objects.select_related('incident').all()
        user = self.request.user
        if user.role.name == 'GUARD':
            return qs.filter(incident__reported_by__user=user)
        return qs


class IncidentPersonViewSet(viewsets.ModelViewSet):
    serializer_class = IncidentPersonSerializer
    permission_classes = [CanReportIncidentOrSupervisor]

    def get_queryset(self):
        qs = IncidentPerson.objects.select_related('incident').all()
        user = self.request.user
        if user.role.name == 'GUARD':
            return qs.filter(incident__reported_by__user=user)
        return qs