from rest_framework.routers import DefaultRouter
from .views import ShiftViewSet, ShiftAssignmentViewSet

router = DefaultRouter()
router.register('shifts', ShiftViewSet, basename='shift')
router.register('assignments', ShiftAssignmentViewSet, basename='shift-assignment')

urlpatterns = router.urls