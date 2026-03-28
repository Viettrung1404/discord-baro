import { create } from "zustand";

export interface ReplyTarget {
  id: string;
  content: string;
  fileUrl?: string | null;
  memberName: string;
  type: "channel" | "conversation";
  contextId: string;
}

interface ReplyStore {
  target: ReplyTarget | null;
  setReply: (target: ReplyTarget) => void;
  clearReply: () => void;
}

export const useReplyStore = create<ReplyStore>((set) => ({
  target: null,
  setReply: (target) => set({ target }),
  clearReply: () => set({ target: null }),
}));
