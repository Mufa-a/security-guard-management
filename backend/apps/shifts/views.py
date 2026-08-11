from datetime import date as date_cls

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from apps.core.permissions import ShiftPermission, ShiftAssignmentPermission
from .models import Shift, ShiftAssignment
from .serializers import ShiftSerializer, ShiftAssignmentSerializer
from . import services


class ShiftViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftSerializer
    permission_classes = [ShiftPermission]

    def get_queryset(self):
        return Shift.objects.select_related('site').all()

    @action(detail=True, methods=['get'])
    def suggest_guards(self, request, pk=None):
        """
        GET /shifts/shifts/{id}/suggest_guards/
        Ranked candidate guards for this shift: site-assigned, conflict-free
        first, then flagged candidates who'd breach an hour cap.
        """
        shift = self.get_object()
        limit = int(request.query_params.get('limit', 10))
        return Response(services.suggest_guards_for_shift(shift, limit=limit))

    @action(detail=False, methods=['post'])
    def copy_week(self, request):
        """
        POST /shifts/shifts/copy_week/
        Body: {
          "source_week_start": "2026-08-04",
          "target_week_start": "2026-08-11",
          "site": <optional site id, omit to copy all sites>,
          "include_assignments": true
        }
        """
        try:
            source_week_start = date_cls.fromisoformat(request.data['source_week_start'])
            target_week_start = date_cls.fromisoformat(request.data['target_week_start'])
        except (KeyError, ValueError):
            raise ValidationError('source_week_start and target_week_start are required, as YYYY-MM-DD.')

        site_id = request.data.get('site')
        site = None
        if site_id:
            from apps.sites.models import Site
            try:
                site = Site.objects.get(id=site_id)
            except Site.DoesNotExist:
                raise ValidationError('site not found.')

        include_assignments = request.data.get('include_assignments', True)
        result = services.copy_week(source_week_start, target_week_start, site=site, include_assignments=include_assignments)
        return Response(result, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def repeat_weekly(self, request):
        """
        POST /shifts/shifts/repeat_weekly/
        Body: {
          "shift_ids": [12, 13, 14],
          "weeks": 4,
          "include_assignments": true
        }
        Repeats the given shifts (typically "this week's roster") forward
        `weeks` times, 7 days apart each time.
        """
        shift_ids = request.data.get('shift_ids')
        weeks = request.data.get('weeks')
        if not shift_ids or not isinstance(shift_ids, list):
            raise ValidationError('shift_ids must be a non-empty list.')
        try:
            weeks = int(weeks)
        except (TypeError, ValueError):
            raise ValidationError('weeks must be an integer.')
        if weeks < 1 or weeks > 52:
            raise ValidationError('weeks must be between 1 and 52.')

        include_assignments = request.data.get('include_assignments', True)
        result = services.repeat_weekly(shift_ids, weeks, include_assignments=include_assignments)
        return Response(result, status=status.HTTP_201_CREATED)


class ShiftAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftAssignmentSerializer
    permission_classes = [ShiftAssignmentPermission]

    def get_queryset(self):
        qs = ShiftAssignment.objects.select_related('shift__site', 'employee__user').all()
        user = self.request.user
        if user.role.name == 'GUARD':
            profile = getattr(user, 'employee_profile', None)
            return qs.filter(employee=profile) if profile else qs.none()
        return qs

    def create(self, request, *args, **kwargs):
        """
        Conflicts are a hard block (400) — a guard can't be in two places
        at once. Hour-cap breaches are a warning only: the assignment is
        still created, but the response flags it so the UI can surface a
        confirmation ("this puts them at 52/48 hrs this week — continue?").
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        shift = serializer.validated_data['shift']
        employee = serializer.validated_data['employee']

        conflicts = services.get_conflicting_assignments(employee, shift)
        if conflicts:
            conflict_detail = [
                {'shift_id': c.shift_id, 'date': c.shift.date.isoformat(), 'site': c.shift.site.name}
                for c in conflicts
            ]
            return Response(
                {'detail': 'This guard is already scheduled for an overlapping shift.', 'conflicts': conflict_detail},
                status=status.HTTP_409_CONFLICT,
            )

        hour_check = services.check_hour_limits(employee, shift)
        instance = serializer.save()
        headers = self.get_success_headers(serializer.data)
        response_data = dict(serializer.data)
        response_data['hour_warning'] = hour_check if (hour_check['exceeds_daily_cap'] or hour_check['exceeds_weekly_cap']) else None
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)