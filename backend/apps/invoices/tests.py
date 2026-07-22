from decimal import Decimal
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status

from apps.accounts.models import User, Role
from apps.sites.models import Client
from .models import Invoice, InvoiceLineItem


class InvoiceAPITests(APITestCase):
    def setUp(self):
        self.admin_role = Role.objects.create(name=Role.RoleName.ADMIN)
        self.guard_role = Role.objects.create(name=Role.RoleName.GUARD)
        self.supervisor_role = Role.objects.create(name=Role.RoleName.SUPERVISOR)

        self.admin = User.objects.create_user(email='admin@test.com', password='pass1234', role=self.admin_role)
        self.guard = User.objects.create_user(email='guard@test.com', password='pass1234', role=self.guard_role)
        self.supervisor = User.objects.create_user(email='sup@test.com', password='pass1234', role=self.supervisor_role)

        self.client_obj = Client.objects.create(name='Test Client')
        self.invoice = Invoice.objects.create(
            client=self.client_obj, invoice_number='INV-001',
            issue_date='2026-07-01', due_date='2026-07-31',
        )
        InvoiceLineItem.objects.create(
            invoice=self.invoice, description='Guard services', quantity=Decimal('30'), unit_price=Decimal('1500.00')
        )

    def test_admin_can_list_invoices(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/invoices/invoices/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_guard_cannot_access_invoices(self):
        self.client.force_authenticate(user=self.guard)
        response = self.client.get('/api/invoices/invoices/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_supervisor_can_view_but_not_create(self):
        self.client.force_authenticate(user=self.supervisor)
        get_response = self.client.get('/api/invoices/invoices/')
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)

        post_response = self.client.post('/api/invoices/invoices/', {
            'client': str(self.client_obj.id),
            'invoice_number': 'INV-002',
            'issue_date': '2026-08-01',
            'due_date': '2026-08-31',
        })
        self.assertEqual(post_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_line_item_total_price_auto_calculated(self):
        item = self.invoice.line_items.first()
        self.assertEqual(item.total_price, Decimal('45000.00'))

    def test_invoice_subtotal_sums_line_items(self):
        self.assertEqual(self.invoice.subtotal, Decimal('45000.00'))