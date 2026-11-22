"use client";

import Portal from "@mui/material/Portal";
import { createContext, use, useMemo, useState, type ReactNode } from "react";

import ActionNotification from "./action-notification";

type Notification = { severity: "success" | "error"; message: string };

const NotificationsContext = createContext<{
  show: (notification: Notification) => void;
  clear: () => void;
} | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<Notification | null>(null);

  const notifications = useMemo(
    () => ({ show: setNotification, clear: () => setNotification(null) }),
    [],
  );

  return (
    <NotificationsContext value={notifications}>
      {children}
      {notification && (
        // A new body child: an open MUI dialog hides only the siblings that existed when it opened.
        <Portal>
          <ActionNotification {...notification} onClose={notifications.clear} />
        </Portal>
      )}
    </NotificationsContext>
  );
}

export function useNotifications() {
  const notifications = use(NotificationsContext);
  if (!notifications) {
    throw new Error("useNotifications needs a NotificationProvider.");
  }

  return notifications;
}
