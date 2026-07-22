from rest_framework.routers import DefaultRouter
from .views import EmployeeProfileViewSet, EmployeeDocumentViewSet

router = DefaultRouter()
router.register("profiles", EmployeeProfileViewSet, basename="employee-profile")
router.register("documents", EmployeeDocumentViewSet, basename="employee-document")

urlpatterns = router.urls