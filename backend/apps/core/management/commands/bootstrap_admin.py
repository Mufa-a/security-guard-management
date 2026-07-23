from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.accounts.models import Role

User = get_user_model()


class Command(BaseCommand):
    help = "Create default roles and an ADMIN superuser if none exist."

    def handle(self, *args, **options):
        for name in ['ADMIN', 'MANAGER', 'SUPERVISOR', 'GUARD', 'CLIENT']:
            Role.objects.get_or_create(name=name)
        self.stdout.write(self.style.SUCCESS("Roles ensured."))

        admin_role = Role.objects.get(name='ADMIN')
        email = 'admin@crimecurb.com'
        password = 'ChangeMe123!'

        if not User.objects.filter(email=email).exists():
            user = User.objects.create_superuser(email=email, password=password)
            user.role = admin_role
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Created admin user: {email} / {password}"))
        else:
            self.stdout.write(self.style.WARNING(f"Admin user {email} already exists — skipped."))