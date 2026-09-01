"""
Wires up apps.core.AuditLog, which existed and was admin-registered but
had nothing writing to it. Connects generically to every BaseModel
subclass instead of one receiver per app, so new domain models get
audit coverage for free.

apps.erip.ErpConversation/ErpMessage are deliberately skipped: they're
chat log churn already covered by apps.erip.ErpAuditLog (see that
model's docstring), and mirroring every chat turn into this table would
just be noise.

Known limitation (matches the note in
attendance/management/commands/mark_absences.py): bulk_update()/
.update() bypass save() and therefore this signal, same as they bypass
any other save()-based hook. Anything that needs auto-absence-style bulk
writes captured here would need to switch to a per-object .save() loop.
"""
import logging
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from django.contrib.auth.signals import user_logged_in
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .middleware import get_current_user
from .models import AuditLog, BaseModel

logger = logging.getLogger(__name__)

_SKIP_LABELS = {"erip.erpconversation", "erip.erpmessage"}
_SENSITIVE_FIELDS = {"password"}


def _serialize(instance):
    data = {}
    for field in instance._meta.fields:
        if field.name in _SENSITIVE_FIELDS:
            continue
        value = getattr(instance, field.attname, None)
        if isinstance(value, UUID):
            value = str(value)
        elif isinstance(value, (datetime, date)):
            value = value.isoformat()
        elif isinstance(value, Decimal):
            value = str(value)
        elif value is not None and not isinstance(value, (str, int, float, bool, list, dict)):
            value = str(value)
        data[field.name] = value
    return data


def _write(action, instance, user):
    try:
        AuditLog.objects.create(
            user=user if user is not None and user.is_authenticated else None,
            action=action,
            model_name=type(instance).__name__,
            object_id=str(instance.pk),
            details=_serialize(instance),
        )
    except Exception:
        # Audit logging must never break the save/delete it's observing.
        logger.exception("Failed to write AuditLog entry for %s", instance)


@receiver(post_save)
def audit_save(sender, instance, created, raw, **kwargs):
    if raw or not isinstance(instance, BaseModel):
        return
    if sender._meta.label_lower in _SKIP_LABELS:
        return
    action = AuditLog.Action.CREATE if created else AuditLog.Action.UPDATE
    _write(action, instance, get_current_user())


@receiver(post_delete)
def audit_delete(sender, instance, **kwargs):
    if not isinstance(instance, BaseModel):
        return
    if sender._meta.label_lower in _SKIP_LABELS:
        return
    _write(AuditLog.Action.DELETE, instance, get_current_user())


@receiver(user_logged_in)
def audit_login(sender, request, user, **kwargs):
    _write(AuditLog.Action.LOGIN, user, user)
