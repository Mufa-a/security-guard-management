from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import IsOwnAttendanceOrSupervisor
from .models import Attendance
from .serializers import AttendanceSerializer, CheckInOutSerializer


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [IsOwnAttendanceOrSupervisor]

    def get_queryset(self):
        qs = Attendance.objects.select_related(
            'shift_assignment__employee__user',
            'shift_assignment__shift__site',
        ).all()
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

        serializer = CheckInOutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        attendance.check_in_time = timezone.now()
        attendance.check_in_latitude = serializer.validated_data.get('latitude')
        attendance.check_in_longitude = serializer.validated_data.get('longitude')
        attendance.status = Attendance.Status.CHECKED_IN
        attendance.save()

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
        attendance.status = Attendance.Status.CHECKED_OUT
        attendance.save()

        # Mark the shift assignment as completed too, so it doesn't linger as "ASSIGNED".
        shift_assignment = attendance.shift_assignment
        shift_assignment.status = 'COMPLETED'
        shift_assignment.save()

        return Response(AttendanceSerializer(attendance).data)