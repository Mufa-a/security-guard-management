from django.contrib import admin
from .models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('description', 'category', 'amount', 'expense_date', 'status')
    list_filter = ('category', 'status')
    search_fields = ('description', 'vendor_name')