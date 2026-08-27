from django.contrib import admin
from .models import ErpConversation, ErpMessage, ErpAuditLog


@admin.register(ErpConversation)
class ErpConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "title", "created_at")
    search_fields = ("title", "user__email")


@admin.register(ErpAuditLog)
class ErpAuditLogAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "user", "role_at_time", "tool_name", "operation_class", "authorized")
    list_filter = ("authorized", "operation_class", "tool_name", "role_at_time")
    search_fields = ("user__email", "tool_name", "denial_reason")
    readonly_fields = [f.name for f in ErpAuditLog._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
