from rest_framework import viewsets
from apps.core.permissions import IsInvoiceManagerOrReadOnly
from .models import Expense
from .serializers import ExpenseSerializer


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsInvoiceManagerOrReadOnly]