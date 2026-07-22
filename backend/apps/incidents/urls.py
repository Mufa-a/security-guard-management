from rest_framework.routers import DefaultRouter
from .views import IncidentViewSet, IncidentAttachmentViewSet

router = DefaultRouter()
router.register('incidents', IncidentViewSet, basename='incident')
router.register('attachments', IncidentAttachmentViewSet, basename='incident-attachment')

urlpatterns = router.urls