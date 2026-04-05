type PublishChatMessageInput = {
  room: string;
  channelId: string;
  message: unknown;
};

type PublishNotificationInput = {
  room: string;
  notification: {
    serverId: string;
    channelId: string;
    messageId: string;
    preview: string;
    senderName?: string;
  };
  excludeProfileId?: string;
};

const getRealtimeBaseUrl = (): string | null => {
  const direct = process.env.REALTIME_SERVER_URL?.trim();
  if (direct) {
    return direct;
  }

  const fallback = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  return fallback || null;
};

const getInternalSecret = (): string | null => {
  const secret = process.env.REALTIME_SERVER_INTERNAL_SECRET?.trim();
  return secret || null;
};

const postToRealtime = async (path: string, payload: unknown): Promise<void> => {
  const baseUrl = getRealtimeBaseUrl();
  const secret = getInternalSecret();

  if (!baseUrl || !secret) {
    return;
  }

  try {
    const url = new URL(path, baseUrl).toString();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[realtime-publisher] publish failed", {
        path,
        status: response.status,
        body: text,
      });
    }
  } catch (error) {
    console.error("[realtime-publisher] publish error", { path, error });
  }
};

export const publishChatMessage = async (input: PublishChatMessageInput) => {
  await postToRealtime("/internal/events/chat-message", input);
};

export const publishNotification = async (input: PublishNotificationInput) => {
  await postToRealtime("/internal/events/notification", input);
};
