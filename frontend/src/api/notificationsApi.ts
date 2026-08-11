import apiClient from './client';

export interface AttendanceNotification {
  id: string;
  notification_type:
    | 'GRACE_PERIOD_ENDING'
    | 'AUTO_ABSENT'
    | 'LATE_REQUEST_SUBMITTED'
    | 'LATE_REQUEST_APPROVED'
    | 'LATE_REQUEST_REJECTED'
    | 'NEW_LATE_REQUEST'
    | 'PENDING_APPROVAL_REMINDER';
  attendance: string | null;
  late_arrival_request: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export async function getMyNotifications(): Promise<AttendanceNotification[]> {
  const { data } = await apiClient.get('/attendance/notifications/');
  return data.results ?? data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await apiClient.get('/attendance/notifications/unread_count/');
  return data.unread_count;
}

export async function markNotificationRead(id: string): Promise<AttendanceNotification> {
  const { data } = await apiClient.post(`/attendance/notifications/${id}/mark_read/`);
  return data;
}

export async function markAllNotificationsRead(): Promise<number> {
  const { data } = await apiClient.post('/attendance/notifications/mark_all_read/');
  return data.marked_read;
}