import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import {
  getMyNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead,
} from '../../api/notificationsApi';
import type { AttendanceNotification } from '../../api/notificationsApi';

const POLL_INTERVAL_MS = 30000;

const TYPE_ICON_COLOR: Record<AttendanceNotification['notification_type'], string> = {
  GRACE_PERIOD_ENDING: 'bg-amber-400',
  AUTO_ABSENT: 'bg-red-500',
  LATE_REQUEST_SUBMITTED: 'bg-blue-400',
  LATE_REQUEST_APPROVED: 'bg-emerald-500',
  LATE_REQUEST_REJECTED: 'bg-red-400',
  NEW_LATE_REQUEST: 'bg-amber-500',
  PENDING_APPROVAL_REMINDER: 'bg-amber-500',
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<AttendanceNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  function refreshCount() {
    getUnreadCount().then(setUnreadCount).catch(() => {});
  }

  function loadList() {
    setIsLoading(true);
    getMyNotifications()
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) loadList();
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  async function handleItemClick(n: AttendanceNotification) {
    if (n.is_read) return;
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await markNotificationRead(n.id);
    } catch {
      loadList();
      refreshCount();
    }
  }

  async function handleMarkAllRead() {
    const previousNotifications = notifications;
    const previousCount = unreadCount;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      setNotifications(previousNotifications);
      setUnreadCount(previousCount);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-[28rem] overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-100 z-50">
          <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-blue-700 hover:underline">
                Mark all read
              </button>
            )}
          </div>

          {isLoading && (
            <p className="text-sm text-slate-400 px-4 py-6 text-center">Loading…</p>
          )}

          {!isLoading && notifications.length === 0 && (
            <p className="text-sm text-slate-400 px-4 py-6 text-center">No notifications yet.</p>
          )}

          {!isLoading && notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleItemClick(n)}
              className={`w-full text-left px-4 py-3 border-b border-slate-50 last:border-b-0 hover:bg-slate-50 transition-colors flex gap-2.5 ${
                n.is_read ? 'opacity-60' : ''
              }`}
            >
              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.is_read ? 'bg-transparent' : TYPE_ICON_COLOR[n.notification_type]}`} />
              <span className="min-w-0">
                <span className="block text-sm text-slate-700 leading-snug">{n.message}</span>
                <span className="block text-xs text-slate-400 mt-0.5">{timeAgo(n.created_at)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}