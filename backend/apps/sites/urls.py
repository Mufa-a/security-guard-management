from rest_framework.routers import DefaultRouter
from .views import ClientViewSet, SiteViewSet, SiteAssignmentViewSet

router = DefaultRouter()
router.register('clients', ClientViewSet, basename='client')
router.register('sites', SiteViewSet, basename='site')
router.register('assignments', SiteAssignmentViewSet, basename='site-assignment')

urlpatterns = router.urls