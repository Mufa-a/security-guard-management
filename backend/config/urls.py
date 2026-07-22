"""
URL configuration for config project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('apps.accounts.urls')),
    path('api/staff/', include('apps.staff.urls')),
    path('api-auth/', include('rest_framework.urls')),
    path('api/sites/', include('apps.sites.urls')),
    path('api/shifts/', include('apps.shifts.urls')),
    path('api/attendance/', include('apps.attendance.urls')),
    path('api/incidents/', include('apps.incidents.urls')),
    path('api/invoices/', include('apps.invoices.urls')),
    path('api/payroll/', include('apps.payroll.urls')),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)