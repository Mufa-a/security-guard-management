from django.contrib import admin
from .models import Incident, IncidentAttachment


class IncidentAttachmentInline(admin.TabularInline):
    model = IncidentAttachment
    extra = 1


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = ('title', 'site', 'category', 'severity', 'status', 'occurred_at', 'reported_by')
    list_filter = ('category', 'severity', 'status', 'site')
    search_fields = ('title', 'description', 'site__name', 'reported_by__user__email')
    date_hierarchy = 'occurred_at'
    inlines = [IncidentAttachmentInline]


@admin.register(IncidentAttachment)
class IncidentAttachmentAdmin(admin.ModelAdmin):
    list_display = ('incident', 'file', 'description')