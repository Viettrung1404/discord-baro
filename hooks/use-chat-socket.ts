import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/components/providers/socket-provider";
import { SOCKET_EVENTS } from "@/lib/socket/constants";
import type { MessageWithMember, DirectMessageWithMember } from "@/lib/socket/types";

interface ChatSocketProps {
    queryKey: string;
    channelId?: string;
    serverId?: string;
}

type MessagePages = {
    pages: Array<{
        items: (MessageWithMember | DirectMessageWithMember)[];
        nextCursor?: string;
    }>;
    pageParams: unknown[];
};

export const useChatSocket = ({
    queryKey,
    channelId,
    serverId,
}: ChatSocketProps) => {
    const { socket, isConnected } = useSocket();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!socket || !isConnected || !channelId) {
            return;
        }

        // Join room directly via Socket.IO
        // Server will receive this via socket.join() in io.on('connection')
        // But we need to emit an event to tell server to add us to room
        if (serverId) {
            socket.emit(SOCKET_EVENTS.CHAT_JOIN, { serverId, channelId });
        } else {
            // For conversation, emit with fake serverId or create new event
            // For now, let's use low-level socket.io.join
            socket.emit("conversation:join", { conversationId: channelId });
        }

        // Upsert incoming messages to avoid double handlers and extra renders.
        const handleIncomingMessage = (payload: { channelId: string; message: MessageWithMember | DirectMessageWithMember }) => {
            const { channelId: messageChannelId, message } = payload;

            // Only update if message is for this channel/conversation
            if (channelId && messageChannelId !== channelId) {
                return;
            }

            queryClient.setQueryData([queryKey], (oldData: MessagePages | undefined) => {
                if (!oldData || !oldData.pages || oldData.pages.length === 0) {
                    return {
                        pages: [{
                            items: [message],
                        }],
                        pageParams: [undefined],
                    };
                }

                let messageExists = false;
                const newData = oldData.pages.map((page) => {
                    const items = page.items.map((item) => {
                        if (item.id === message.id) {
                            messageExists = true;
                            return message;
                        }
                        return item;
                    });

                    return {
                        ...page,
                        items,
                    };
                });

                if (!messageExists) {
                    newData[0] = {
                        ...newData[0],
                        items: [message, ...newData[0].items],
                    };
                }

                return {
                    ...oldData,
                    pages: newData,
                };
            });
        };

        // Register event listeners
        socket.on(SOCKET_EVENTS.CHAT_MESSAGE, handleIncomingMessage);

        // Cleanup
        return () => {
            socket.off(SOCKET_EVENTS.CHAT_MESSAGE, handleIncomingMessage);
        };
    }, [socket, isConnected, queryClient, queryKey, channelId, serverId]);
};
