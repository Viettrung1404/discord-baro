-- Drop less selective pinned indexes
DROP INDEX IF EXISTS "Message_pinned_channelId_idx";
DROP INDEX IF EXISTS "DirectMessage_pinned_conversationId_idx";

-- Add composite indexes that match pinned list/count filters and sort order
CREATE INDEX "Message_channel_pinned_active_pinnedAt_idx"
ON "Message"("channelId", "pinned", "deleted", "pinnedAt" DESC);

CREATE INDEX "DirectMessage_conversation_pinned_active_pinnedAt_idx"
ON "DirectMessage"("conversationId", "pinned", "deleted", "pinnedAt" DESC);
