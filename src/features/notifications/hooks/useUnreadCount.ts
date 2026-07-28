import { useNotifications } from "@/features/notifications/hooks/useNotifications";

// Derived from the same cached list `useNotifications` populates, rather than
// a separate count query, so the bell badge and the list stay in sync off a
// single cache entry (queryKeys.notifications(profileId)).
export function useUnreadCount(): number {
  const { data } = useNotifications();
  if (!data) return 0;
  return data.reduce((count, notification) => (notification.read_at === null ? count + 1 : count), 0);
}
