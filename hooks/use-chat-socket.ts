import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/components/providers/socket-provider";
import { SOCKET_EVENTS } from "@/lib/socket/constants";
import type { MessageWithMember } from "@/lib/socket/types";

interface ChatSocketProps {
    queryKey: string;
    channelId?: string;
}

type MessagePages = {
    pages: Array<{
        items: MessageWithMember[];
        nextCursor?: string;
    }>;
    pageParams: unknown[];
};

export const useChatSocket = ({
    queryKey,
    channelId,
}: ChatSocketProps) => {
    const { socket, isConnected } = useSocket();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!socket || !isConnected) {
            return;
        }

        // Listen for new messages
        const handleNewMessage = (payload: { channelId: string; message: MessageWithMember }) => {
            const { channelId: messageChannelId, message } = payload;

            // Only update if message is for this channel
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

                const newData = [...oldData.pages];
                
                // Check if message already exists (prevent duplicates)
                const messageExists = newData.some(page => 
                    page.items.some(item => item.id === message.id)
                );

                if (!messageExists) {
                    // Add new message to the first page (most recent)
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

        // Listen for updated messages (edit/delete)
        const handleUpdateMessage = (payload: { channelId: string; message: MessageWithMember }) => {
            const { channelId: messageChannelId, message } = payload;

            // Only update if message is for this channel
            if (channelId && messageChannelId !== channelId) {
                return;
            }

            queryClient.setQueryData([queryKey], (oldData: MessagePages | undefined) => {
                if (!oldData || !oldData.pages || oldData.pages.length === 0) {
                    return oldData;
                }

                const newData = oldData.pages.map((page) => {
                    return {
                        ...page,
                        items: page.items.map((item) => {
                            if (item.id === message.id) {
                                return message;
                            }
                            return item;
                        }),
                    };
                });

                return {
                    ...oldData,
                    pages: newData,
                };
            });
        };

        // Register event listeners
        socket.on(SOCKET_EVENTS.CHAT_MESSAGE, handleNewMessage);
        socket.on(SOCKET_EVENTS.CHAT_MESSAGE, handleUpdateMessage);

        // Cleanup
        return () => {
            socket.off(SOCKET_EVENTS.CHAT_MESSAGE, handleNewMessage);
            socket.off(SOCKET_EVENTS.CHAT_MESSAGE, handleUpdateMessage);
        };
    }, [socket, isConnected, queryClient, queryKey, channelId]);
};
