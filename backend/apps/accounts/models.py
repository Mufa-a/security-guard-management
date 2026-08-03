import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone
from datetime import timedelta

CURRENT_POLICY_VERSION = "1.0"


class Role(models.Model):
    class RoleName(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        MANAGER = "MANAGER", "Manager"
        SUPERVISOR = "SUPERVISOR", "Supervisor"
        GUARD = "GUARD", "Guard"
        CLIENT = "CLIENT", "Client"

    name = models.CharField(max_length=20, choices=RoleName.choices, unique=True)
    description = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return self.name


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True)
    role = models.ForeignKey(
        Role, on_delete=models.PROTECT, related_name="users", null=True
    )
    is_verified = models.BooleanField(default=False)

    # Policy consent — recorded at account creation, with the version
    # accepted, so any future policy update can be tracked separately.
    policy_accepted_at = models.DateTimeField(null=True, blank=True)
    policy_version = models.CharField(max_length=20, blank=True)

    # Per-account password lockout — separate from the per-IP IPLockout.
    # Protects a single account from targeted brute-forcing even if the
    # attacker rotates IPs.
    failed_password_attempts = models.PositiveSmallIntegerField(default=0)
    password_locked_until = models.DateTimeField(null=True, blank=True)

    PASSWORD_LOCKOUT_THRESHOLD = 5
    PASSWORD_LOCKOUT_DURATION_MINUTES = 15

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def is_password_locked(self):
        return bool(self.password_locked_until and self.password_locked_until > timezone.now())

    def register_password_failure(self):
        self.failed_password_attempts += 1
        if self.failed_password_attempts >= self.PASSWORD_LOCKOUT_THRESHOLD:
            self.password_locked_until = timezone.now() + timedelta(minutes=self.PASSWORD_LOCKOUT_DURATION_MINUTES)
        self.save(update_fields=["failed_password_attempts", "password_locked_until"])

    def register_password_success(self):
        self.failed_password_attempts = 0
        self.password_locked_until = None
        self.save(update_fields=["failed_password_attempts", "password_locked_until"])

    def __str__(self):
        return self.email


class IPLockout(models.Model):
    """
    Tracks failed login attempts per IP address, across both password
    login and PIN login. Separate from the per-guard PIN lockout on
    EmployeeProfile — this catches an attacker hammering many different
    accounts from one IP, not just repeated guesses against one account.

    Failed attempts decay: if the last attempt was longer than
    FAILURE_WINDOW_MINUTES ago, the counter resets before counting the
    new failure. This means occasional, spaced-out mistakes (e.g. a user
    forgetting their password over several weeks) won't accumulate into
    a lockout — only a burst of failures within the window will.
    """

    ip_address = models.GenericIPAddressField(unique=True)
    failed_attempts = models.PositiveSmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    last_attempt_at = models.DateTimeField(auto_now=True)

    LOCKOUT_THRESHOLD = 10
    LOCKOUT_DURATION_MINUTES = 30
    FAILURE_WINDOW_MINUTES = 15

    def is_locked(self):
        return bool(self.locked_until and self.locked_until > timezone.now())

    def register_failure(self):
        now = timezone.now()

        # Reset the counter if the last attempt fell outside the window —
        # otherwise old, unrelated failures keep counting toward a lockout.
        if self.last_attempt_at and (now - self.last_attempt_at) > timedelta(minutes=self.FAILURE_WINDOW_MINUTES):
            self.failed_attempts = 0

        self.failed_attempts += 1
        if self.failed_attempts >= self.LOCKOUT_THRESHOLD:
            self.locked_until = now + timedelta(minutes=self.LOCKOUT_DURATION_MINUTES)
        self.save(update_fields=["failed_attempts", "locked_until", "last_attempt_at"])

    def register_success(self):
        self.failed_attempts = 0
        self.locked_until = None
        self.save(update_fields=["failed_attempts", "locked_until", "last_attempt_at"])

    def __str__(self):
        return f"{self.ip_address} ({self.failed_attempts} failed attempts)"