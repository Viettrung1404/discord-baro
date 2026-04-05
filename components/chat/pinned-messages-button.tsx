"use client";

import { Pin } from "lucide-react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { useModal } from "@/hooks/use-modal-store";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";

interface PinnedMessagesButtonProps {
  channelId?: string;
  conversationId?: string;
  type: "channel" | "conversation";
}

export const PinnedMessagesButton = ({ channelId, conversationId, type }: PinnedMessagesButtonProps) => {
  const { onOpen } = useModal();

  const targetId = type === "channel" ? channelId : conversationId;

  const { data: pinnedCount = 0 } = useQuery({
    queryKey: ["pinnedCount", type, targetId],
    enabled: !!targetId,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!targetId) {
        return 0;
      }

      const endpoint = type === "channel"
        ? `/api/channels/${targetId}/pinned/count`
        : `/api/conversations/${targetId}/pinned/count`;

      const response = await axios.get<{ count: number }>(endpoint);
      return response.data.count ?? 0;
    },
  });

  return (
    <ActionTooltip label={pinnedCount > 0 ? `${pinnedCount} Pinned Messages` : "No Pinned Messages"}>
      <button
        onClick={() => onOpen("viewPinnedMessages", { 
          channelId: type === "channel" ? channelId : undefined,
          conversationId: type === "conversation" ? conversationId : undefined,
          type 
        })}
        className="relative group p-2 rounded-md hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 transition"
      >
        <Pin className="w-5 h-5 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition" />
        {pinnedCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {pinnedCount > 9 ? '9+' : pinnedCount}
          </span>
        )}
      </button>
    </ActionTooltip>
  );
};
