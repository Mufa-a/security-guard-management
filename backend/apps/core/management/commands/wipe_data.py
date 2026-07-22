from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = "Wipe all data except ADMIN user accounts. Requires --yes to confirm."

    def add_arguments(self, parser):
        parser.add_argument('--yes', action='store_true', help='Confirm the wipe.')

    def handle(self, *args, **options):
        if not options['yes']:
            self.stdout.write(self.style.WARNING(
                "This will delete ALL data except ADMIN users. Re-run with --yes to confirm."
            ))
            return

        from apps.payroll.models import PayrollPeriod, SalaryStructure, Allowance, Deduction, Payslip
        from apps.invoices.models import Invoice, InvoiceLineItem
        from apps.incidents.models import Incident, IncidentAttachment
        from apps.attendance.models import Attendance
        from apps.shifts.models import Shift, ShiftAssignment
        from apps.sites.models import Client, Site, SiteAssignment
        from apps.staff.models import EmployeeProfile, EmployeeDocument
        from apps.core.models import AuditLog

        self.stdout.write("Deleting payroll data...")
        Payslip.objects.all().delete()
        Deduction.objects.all().delete()
        Allowance.objects.all().delete()
        SalaryStructure.objects.all().delete()
        PayrollPeriod.objects.all().delete()

        self.stdout.write("Deleting invoices...")
        InvoiceLineItem.objects.all().delete()
        Invoice.objects.all().delete()

        self.stdout.write("Deleting incidents...")
        IncidentAttachment.objects.all().delete()
        Incident.objects.all().delete()

        self.stdout.write("Deleting attendance...")
        Attendance.objects.all().delete()

        self.stdout.write("Deleting shifts...")
        ShiftAssignment.objects.all().delete()
        Shift.objects.all().delete()

        self.stdout.write("Deleting sites and clients...")
        SiteAssignment.objects.all().delete()
        Site.objects.all().delete()
        Client.objects.all().delete()

        self.stdout.write("Deleting staff profiles...")
        EmployeeDocument.objects.all().delete()
        EmployeeProfile.objects.all().delete()

        self.stdout.write("Deleting audit logs...")
        AuditLog.objects.all().delete()

        self.stdout.write("Deleting non-admin users...")
        non_admin_users = User.objects.exclude(role__name='ADMIN')
        count = non_admin_users.count()
        non_admin_users.delete()

        self.stdout.write(self.style.SUCCESS(
            f"Done. Removed {count} non-admin user(s) and all related data. ADMIN accounts preserved."
        ))