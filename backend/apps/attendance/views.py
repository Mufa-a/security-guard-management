from datetime import datetime
from .notifications import notify, notify_supervisors, guard_user
from .models import AttendanceNotification  # add AttendanceNotification to your existing model import if not already there

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from apps.core.permissions import IsOwnAttendanceOrSupervisor, IsSupervisorOrAbove
from .constants import GRACE_PERIOD_MINUTES, LATE_THRESHOLD_MINUTES
from .models import Attendance, LateArrivalRequest, AttendanceNotification
from .serializers import AttendanceSerializer, CheckInOutSerializer, LateArrivalRequestSerializer


def _shift_start_datetime(attendance):
    shift = attendance.shift_assignment.shift
    naive_start = datetime.combine(shift.date, shift.start_time)
    return timezone.make_aware(naive_start, timezone.get_current_timezone())


def _minutes_late(attendance, now):
    return max(0, int((now - _shift_start_datetime(attendance)).total_seconds() // 60))


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [IsOwnAttendanceOrSupervisor]

    def get_queryset(self):
        qs = Attendance.objects.select_related(
            'shift_assignment__employee__user',
            'shift_assignment__shift__site',
        ).prefetch_related('late_arrival_requests').all()
        user = self.request.user
        if user.role.name == 'GUARD':
            return qs.filter(shift_assignment__employee__user=user)
        return qs

    @action(detail=True, methods=['post'], url_path='check-in')
    def check_in(self, request, pk=None):
        attendance = self.get_object()

        if attendance.check_in_time is not None:
            return Response(
                {'detail': 'Already checked in.'}, status=status.HTTP_400_BAD_REQUEST
            )

        now = timezone.now()
        minutes_late = _minutes_late(attendance, now)

        # Already auto-marked absent — only an approved late arrival request
        # unlocks check-in from here.
        if attendance.status == Attendance.Status.ABSENT:
            if attendance.late_request_status != LateArrivalRequest.Status.APPROVED:
                return Response(
                    {'detail': 'You were marked absent for this shift. Submit a late arrival request for supervisor approval before checking in.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

            serializer = CheckInOutSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            attendance.check_in_time = now
            attendance.check_in_latitude = serializer.validated_data.get('latitude')
            attendance.check_in_longitude = serializer.validated_data.get('longitude')
            attendance.minutes_late = minutes_late
            attendance.status = Attendance.Status.PRESENT_LATE_APPROVED
            attendance.save()

            shift_assignment = attendance.shift_assignment
            shift_assignment.status = 'CONFIRMED'
            shift_assignment.save()

            return Response(AttendanceSerializer(attendance).data)

        # Safety net: shift has crossed the absence threshold but the
        # mark_absences command hasn't run yet — don't allow an unapproved
        # very-late check-in; flip to ABSENT now instead.
        if minutes_late >= LATE_THRESHOLD_MINUTES:
            attendance.status = Attendance.Status.ABSENT
            attendance.auto_marked_absent = True
            attendance.minutes_late = minutes_late 
            attendance.save()
            return Response(
                {'detail': 'This shift has passed the absence threshold. Submit a late arrival request.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CheckInOutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attendance.check_in_time = now
        attendance.check_in_latitude = serializer.validated_data.get('latitude')
        attendance.check_in_longitude = serializer.validated_data.get('longitude')

        if minutes_late > GRACE_PERIOD_MINUTES:
            attendance.minutes_late = minutes_late
            attendance.status = Attendance.Status.PRESENT_LATE
        else:
            attendance.status = Attendance.Status.PRESENT

        attendance.save()

        shift_assignment = attendance.shift_assignment
        shift_assignment.status = 'CONFIRMED'
        shift_assignment.save()

        return Response(AttendanceSerializer(attendance).data)

    @action(detail=True, methods=['post'], url_path='check-out')
    def check_out(self, request, pk=None):
        attendance = self.get_object()

        if attendance.check_in_time is None:
            return Response(
                {'detail': 'Cannot check out before checking in.'}, status=status.HTTP_400_BAD_REQUEST
            )
        if attendance.check_out_time is not None:
            return Response(
                {'detail': 'Already checked out.'}, status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CheckInOutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        attendance.check_out_time = timezone.now()
        attendance.check_out_latitude = serializer.validated_data.get('latitude')
        attendance.check_out_longitude = serializer.validated_data.get('longitude')
        attendance.save()

        shift_assignment = attendance.shift_assignment
        shift_assignment.status = 'COMPLETED'
        shift_assignment.save()

        return Response(AttendanceSerializer(attendance).data)

    @action(
        detail=True, methods=['post'], url_path='late-arrival-request',
        parser_classes=[MultiPartParser, FormParser, JSONParser],
    )
    def submit_late_arrival_request(self, request, pk=None):
        """Guard (on their own ABSENT record) or Supervisor+ submits a late
        arrival request explaining why the guard is checking in late."""
        attendance = self.get_object()

        if attendance.status != Attendance.Status.ABSENT:
            return Response(
                {'detail': 'This record is not marked absent.'}, status=status.HTTP_400_BAD_REQUEST
            )

        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response({'detail': 'A reason is required.'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        late_request = LateArrivalRequest.objects.create(
            attendance=attendance,
            reason=reason,
            explanation=request.data.get('explanation', '').strip(),
            attachment=request.FILES.get('attachment'),
            latitude=request.data.get('latitude') or None,
            longitude=request.data.get('longitude') or None,
            minutes_late_at_submission=_minutes_late(attendance, now),
        )

        attendance.late_request_status = LateArrivalRequest.Status.PENDING
        attendance.save(update_fields=['late_request_status'])

        notify(
            guard_user(attendance),
            AttendanceNotification.NotificationType.LATE_REQUEST_SUBMITTED,
            message=f"Your late arrival request for {attendance.shift_assignment.shift.site.name} has been submitted and is pending review.",
            attendance=attendance,
            late_arrival_request=late_request,
        )
        notify_supervisors(
            AttendanceNotification.NotificationType.NEW_LATE_REQUEST,
            message=f"{attendance.shift_assignment.employee} submitted a late arrival request for {attendance.shift_assignment.shift.site.name}.",
            attendance=attendance,
            late_arrival_request=late_request,
        )

        return Response(LateArrivalRequestSerializer(late_request).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='late-arrival-review', permission_classes=[IsSupervisorOrAbove])
    def review_late_arrival(self, request, pk=None):
        """Supervisor+ approves or rejects the most recent pending late
        arrival request on this attendance record."""
        attendance = self.get_object()
        late_request = attendance.late_arrival_requests.filter(
            status=LateArrivalRequest.Status.PENDING
        ).order_by('-submitted_at').first()

        if not late_request:
            return Response(
                {'detail': 'No pending late arrival request for this record.'}, status=status.HTTP_400_BAD_REQUEST
            )

        approved = request.data.get('approved')
        if approved is None:
            return Response({'detail': "'approved' (true/false) is required."}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        notes = request.data.get('notes', '').strip()

        late_request.status = LateArrivalRequest.Status.APPROVED if approved else LateArrivalRequest.Status.REJECTED
        late_request.reviewed_by = request.user
        late_request.reviewed_at = now
        late_request.review_notes = notes
        late_request.save()

        attendance.late_request_status = late_request.status
        if approved:
            attendance.approved_by = request.user
            attendance.approved_at = now
            attendance.approval_notes = notes
            # status stays ABSENT — the guard still has to actually check in;
            # check_in() flips it to PRESENT_LATE_APPROVED once they do.
        attendance.save()

        notify(
            guard_user(attendance),
            AttendanceNotification.NotificationType.LATE_REQUEST_APPROVED if approved
                else AttendanceNotification.NotificationType.LATE_REQUEST_REJECTED,
            message=(
                f"Your late arrival request for {attendance.shift_assignment.shift.site.name} was approved. You can now check in."
                if approved else
                f"Your late arrival request for {attendance.shift_assignment.shift.site.name} was rejected."
                + (f' Note: "{notes}"' if notes else "")
            ),
            attendance=attendance,
            late_arrival_request=late_request,
        )

        return Response(AttendanceSerializer(attendance).data)

# --- Appended by setup_notification_api.py ---
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
