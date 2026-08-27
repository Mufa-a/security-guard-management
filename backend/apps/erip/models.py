import uuid
from django.conf import settings
from django.db import models
from apps.core.models import BaseModel


class ErpConversation(BaseModel):
    """A chat thread between one user and Erip. Scoped to that user only —
    Erip never shows one user's conversation history to another, regardless
    of role."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="erip_conversations"
    )
    title = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title or f"Conversation {self.id}"


class ErpMessage(BaseModel):
    class Role(models.TextChoices):
        USER = "USER", "User"
        ASSISTANT = "ASSISTANT", "Assistant"

    conversation = models.ForeignKey(
        ErpConversation, on_delete=models.CASCADE, related_name="messages"
    )
    role = models.CharField(max_length=10, choices=Role.choices)
    content = models.TextField()

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.role}: {self.content[:50]}"


class ErpAuditLog(models.Model):
    """One row per tool call attempt, whether or not it was authorized —
    this is the record that answers 'what did the AI actually touch?' and
    'did anyone try to get it to do something it shouldn't.'

    Deliberately NOT stored in apps.core.AuditLog: that model's Action enum
    (CREATE/UPDATE/DELETE/LOGIN/OTHER) has no room for tool_name,
    authorization result, or operation class, and overloading it would make
    both harder to query.
    """

    class OperationClass(models.TextChoices):
        READ = "READ", "Read"
        ANALYSIS = "ANALYSIS", "Analysis"
        PREPARE = "PREPARE", "Prepare"
        EXECUTE = "EXECUTE", "Execute"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="erip_audit_logs"
    )
    role_at_time = models.CharField(max_length=20, blank=True)
    conversation = models.ForeignKey(
        ErpConversation, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_entries"
    )
    tool_name = models.CharField(max_length=100)
    operation_class = models.CharField(max_length=10, choices=OperationClass.choices)
    arguments = models.JSONField(blank=True, null=True)
    authorized = models.BooleanField()
    denial_reason = models.CharField(max_length=255, blank=True)
    result_summary = models.CharField(max_length=500, blank=True)
    error = models.CharField(max_length=500, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        status = "OK" if self.authorized else "DENIED"
        return f"[{status}] {self.tool_name} by {self.user} at {self.timestamp}"
