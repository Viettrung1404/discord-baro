import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/components/providers/socket-provider";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";

type NotificationPayload = {
  serverId: string;
  channelId: string;
  messageId: string;
  preview: string;
  senderName?: string; // Tên người gửi
};

/**
 * Hook để listen notification từ Socket.IO
 * Hiển thị toast notification kiểu Facebook/Messenger
 */
export const useNotificationSocket = () => {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) {
      return;
    }

    // Listen for new notification
    const handleNewNotification = (payload: NotificationPayload) => {
      // Backend đã lọc, chỉ emit cho người nhận
      
      // 1. Invalidate queries để cập nhật badge số
      queryClient.invalidateQueries({
        queryKey: [`notifications:${payload.serverId}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`notifications:${payload.channelId}`],
      });

      // 2. Hiển thị toast notification (popup góc phải)
      toast(payload.senderName || "Tin nhắn mới", {
        description: payload.preview,
        duration: 5000,
        position: "bottom-right",
        action: {
          label: "Xem",
          onClick: () => {
            // TODO: Navigate to message
            console.log("Navigate to message:", payload.messageId);
          },
        },
      });
    };

    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [socket, queryClient]);
};
