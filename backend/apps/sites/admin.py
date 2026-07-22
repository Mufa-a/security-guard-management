from django.contrib import admin
from .models import Client, Site, SiteAssignment


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('name', 'contact_person', 'contact_phone', 'is_active')
    search_fields = ('name', 'contact_person', 'contact_email')
    list_filter = ('is_active',)


@admin.register(Site)
class SiteAdmin(admin.ModelAdmin):
    list_display = ('name', 'client', 'is_active')
    search_fields = ('name', 'client__name', 'address')
    list_filter = ('is_active', 'client')


@admin.register(SiteAssignment)
class SiteAssignmentAdmin(admin.ModelAdmin):
    list_display = ('employee', 'site', 'start_date', 'end_date', 'is_active')
    search_fields = ('employee__user__email', 'site__name')
    list_filter = ('is_active', 'site')