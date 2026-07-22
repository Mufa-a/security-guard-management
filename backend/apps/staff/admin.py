from django.contrib import admin
from .models import EmployeeProfile, EmployeeDocument


class EmployeeDocumentInline(admin.TabularInline):
    model = EmployeeDocument
    extra = 0


@admin.register(EmployeeProfile)
class EmployeeProfileAdmin(admin.ModelAdmin):
    list_display = ("employee_number", "user", "employment_status", "date_employed", "is_active")
    list_filter = ("employment_status", "gender", "is_active")
    search_fields = ("employee_number", "national_id", "user__email")
    inlines = [EmployeeDocumentInline]


@admin.register(EmployeeDocument)
class EmployeeDocumentAdmin(admin.ModelAdmin):
    list_display = ("employee", "document_type", "expiry_date")
    list_filter = ("document_type",)