"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Component để request desktop notification permission
 * Hiển thị ở settings hoặc user menu
 */
export const NotificationSettings = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ("Notification" in window) {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        new Notification("Thông báo đã bật!", {
          body: "Bạn sẽ nhận được thông báo khi có tin nhắn mới",
          icon: "/logo.png",
        });
      }
    }
  };

  if (!("Notification" in window)) {
    return (
      <div className="text-sm text-zinc-500">
        Trình duyệt không hỗ trợ desktop notifications
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <div className="text-sm font-medium">Desktop Notifications</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Nhận thông báo khi có tin nhắn mới
        </div>
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {permission === "granted" ? (
              <Button variant="ghost" size="icon" disabled>
                <Bell className="h-5 w-5 text-green-600" />
              </Button>
            ) : permission === "denied" ? (
              <Button variant="ghost" size="icon" disabled>
                <BellOff className="h-5 w-5 text-red-600" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={requestPermission}>
                <Bell className="h-5 w-5" />
              </Button>
            )}
          </TooltipTrigger>
          <TooltipContent>
            {permission === "granted"
              ? "Thông báo đã bật"
              : permission === "denied"
              ? "Bị chặn - Cần bật trong settings trình duyệt"
              : "Bấm để bật thông báo"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
