from rest_framework.routers import DefaultRouter
from .views import AttendanceViewSet, NotificationViewSet

router = DefaultRouter()
router.register('records', AttendanceViewSet, basename='attendance')
router.register('notifications', NotificationViewSet, basename='attendance-notification')

urlpatterns = router.urls
