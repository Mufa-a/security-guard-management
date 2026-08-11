"""
Run from backend/ (same folder as manage.py):

    python setup_notification_api.py

What it does:
  - Appends AttendanceNotificationSerializer to serializers.py (only if
    not already present).
  - Appends NotificationViewSet to views.py (only if not already present).
  - Backs up urls.py to urls.py.bak, then replaces it with a version
    that additionally registers the notifications endpoint (your
    existing 'records' registration is preserved exactly).

New endpoints after this:
    GET  /api/attendance/notifications/              -- list your own notifications
    GET  /api/attendance/notifications/<id>/          -- retrieve one
    POST /api/attendance/notifications/<id>/mark_read/
    POST /api/attendance/notifications/mark_all_read/
    GET  /api/attendance/notifications/unread_count/
"""
import os

BASE = os.path.join("apps", "attendance")


def write_file(path, content):
    exists = os.path.exists(path)
    if exists:
        backup = path + ".bak"
        with open(path, "r", encoding="utf-8") as f:
            old_content = f.read()
        with open(backup, "w", encoding="utf-8") as f:
            f.write(old_content)
        print(f"Backed up existing file to: {backup}")
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"{'Overwrote' if exists else 'Created'}: {path}")


def append_if_missing(path, block, marker):
    if not os.path.exists(path):
        print(f"ERROR: {path} not found — skipping. Add the block manually.")
        return
    with open(path, "r", encoding="utf-8") as f:
        existing = f.read()
    if marker in existing:
        print(f"SKIP: {marker} already present in {path}")
        return
    with open(path, "a", encoding="utf-8") as f:
        f.write("\n\n" + block)
    print(f"Appended {marker} to {path}")


SERIALIZER_BLOCK = '''# --- Appended by setup_notification_api.py ---
from .models import AttendanceNotification as _AttendanceNotification


class AttendanceNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = _AttendanceNotification
        fields = [
            'id', 'notification_type', 'attendance', 'late_arrival_request',
            'message', 'is_read', 'created_at',
        ]
        read_only_fields = fields
'''

VIEWS_BLOCK = '''# --- Appended by setup_notification_api.py ---
from .models import AttendanceNotification as _AttendanceNotification
from .serializers import AttendanceNotificationSerializer as _AttendanceNotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    """
    Read-only-ish: guards/supervisors only ever list their own
    notifications and mark them read. Nothing here creates a
    notification -- that only happens via attendance/notifications.py
    (notify / notify_supervisors), called from the attendance views and
    management commands.
    """
    serializer_class = _AttendanceNotificationSerializer
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        return _AttendanceNotification.objects.filter(
            recipient=self.request.user
        ).select_related('attendance', 'late_arrival_request')

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return Response(_AttendanceNotificationSerializer(notif).data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'marked_read': updated})
'''

URLS_PY = '''from rest_framework.routers import DefaultRouter
from .views import AttendanceViewSet, NotificationViewSet

router = DefaultRouter()
router.register('records', AttendanceViewSet, basename='attendance')
router.register('notifications', NotificationViewSet, basename='attendance-notification')

urlpatterns = router.urls
'''


def main():
    if not os.path.isdir(BASE):
        print(f"ERROR: {BASE} not found. Run this from your backend/ directory.")
        return

    append_if_missing(os.path.join(BASE, "serializers.py"), SERIALIZER_BLOCK, "class AttendanceNotificationSerializer")
    append_if_missing(os.path.join(BASE, "views.py"), VIEWS_BLOCK, "class NotificationViewSet")
    write_file(os.path.join(BASE, "urls.py"), URLS_PY)

    print("\nDone. Next steps:")
    print("  1. python manage.py runserver   (confirm no import errors)")
    print("  2. Log in, then GET /api/attendance/notifications/ should return your notifications")


if __name__ == "__main__":
    main()
