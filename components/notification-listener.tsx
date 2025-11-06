"use client";

import { useNotificationSocket } from "@/hooks/use-notification-socket";

/**
 * Component "vô hình" chỉ để listen Socket.IO notifications
 * Đặt trong layout để chạy toàn bộ app
 */
export const NotificationListener = () => {
  useNotificationSocket();
  return null; // Không render gì
};
