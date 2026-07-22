from rest_framework import viewsets
from apps.core.permissions import IsManagerOrAdminOrReadOnly
from .models import Client, Site, SiteAssignment
from .serializers import ClientSerializer, SiteSerializer, SiteAssignmentSerializer


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all().order_by('name')
    serializer_class = ClientSerializer
    permission_classes = [IsManagerOrAdminOrReadOnly]


class SiteViewSet(viewsets.ModelViewSet):
    queryset = Site.objects.select_related('client').all().order_by('name')
    serializer_class = SiteSerializer
    permission_classes = [IsManagerOrAdminOrReadOnly]


class SiteAssignmentViewSet(viewsets.ModelViewSet):
    queryset = SiteAssignment.objects.select_related('site', 'employee__user').all().order_by('-start_date')
    serializer_class = SiteAssignmentSerializer
    permission_classes = [IsManagerOrAdminOrReadOnly]