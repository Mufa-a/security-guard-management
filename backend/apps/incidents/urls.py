from rest_framework.routers import DefaultRouter
from .views import IncidentViewSet, IncidentAttachmentViewSet, WitnessViewSet, IncidentPersonViewSet


router = DefaultRouter()
router.register('incidents', IncidentViewSet, basename='incident')
router.register('attachments', IncidentAttachmentViewSet, basename='incident-attachment')

router.register('witnesses', WitnessViewSet, basename='witness')
router.register('people-involved', IncidentPersonViewSet, basename='incident-person')

urlpatterns = router.urls