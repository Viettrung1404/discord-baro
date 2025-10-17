# Chat Hooks Documentation

## 📚 Overview

Hệ thống chat hooks được xây dựng trên Socket.IO với 3 hooks chính:

1. **`useChatQuery`** - Fetch messages với pagination
2. **`useChatSocket`** - Listen real-time messages qua Socket.IO
3. **`useChatScroll`** - Auto-scroll và load more

---

## 🔧 1. useChatQuery

### Công dụng:
- Load messages ban đầu từ API
- Infinite scroll pagination
- Tự động polling khi socket disconnect

### Usage:
```typescript
const {
    data,              // Messages data (paginated)
    fetchNextPage,     // Load more messages
    hasNextPage,       // Has more messages?
    isFetchingNextPage,// Loading more?
    status,            // 'pending' | 'error' | 'success'
} = useChatQuery({
    queryKey: "chat:channel-123",
    apiUrl: "/api/messages",
    paramKey: "channelId",
    paramValue: "channel-123",
});
```

### Data Structure:
```typescript
data: {
    pages: [
        {
            items: MessageWithMember[],
            nextCursor: string | undefined,
        }
    ],
    pageParams: unknown[]
}
```

---

## 🔌 2. useChatSocket

### Công dụng:
- Listen `chat:message` event từ Socket.IO server
- Tự động update React Query cache khi có message mới
- Prevent duplicate messages

### Usage:
```typescript
useChatSocket({
    queryKey: "chat:channel-123",
    channelId: "channel-123",
});
```

### Socket Event Flow:
```
Server emits → socket.emit("chat:message", { channelId, message })
                                ↓
Client receives → handleNewMessage(payload)
                                ↓
Update cache → queryClient.setQueryData()
                                ↓
UI auto-updates → React re-renders
```

---

## 📜 3. useChatScroll

### Công dụng:
- Auto-scroll to bottom khi có message mới
- Load more messages khi scroll to top
- Smart scroll detection (chỉ auto-scroll khi user đang ở bottom)

### Usage:
```typescript
const chatRef = useRef<HTMLDivElement>(null);
const bottomRef = useRef<HTMLDivElement>(null);

useChatScroll({
    chatRef,
    bottomRef,
    loadMore: fetchNextPage,
    shouldLoadMore: !isFetchingNextPage && !!hasNextPage,
    count: data?.pages?.[0]?.items?.length ?? 0,
});
```

### HTML Structure:
```jsx
<div ref={chatRef} className="overflow-y-auto">
    {/* Messages here */}
    <div ref={bottomRef} /> {/* Scroll anchor */}
</div>
```

---

## 🎯 Complete Example

```typescript
"use client";

import { useRef } from "react";
import { useChatQuery } from "@/hooks/use-chat-query";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { useChatScroll } from "@/hooks/use-chat-scroll";

export default function ChannelPage({ params }: { params: { channelId: string } }) {
    const queryKey = `chat:${params.channelId}`;
    const chatRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // 1️⃣ Load messages
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useChatQuery({
        queryKey,
        apiUrl: "/api/messages",
        paramKey: "channelId",
        paramValue: params.channelId,
    });

    // 2️⃣ Real-time updates
    useChatSocket({
        queryKey,
        channelId: params.channelId,
    });

    // 3️⃣ Auto-scroll
    useChatScroll({
        chatRef,
        bottomRef,
        loadMore: fetchNextPage,
        shouldLoadMore: !isFetchingNextPage && !!hasNextPage,
        count: data?.pages?.[0]?.items?.length ?? 0,
    });

    return (
        <div ref={chatRef} className="flex-1 overflow-y-auto">
            {/* Render messages */}
            {data?.pages?.map((group) =>
                group.items.map((message) => (
                    <div key={message.id}>
                        {message.content}
                    </div>
                ))
            )}
            <div ref={bottomRef} />
        </div>
    );
}
```

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    USER ACTIONS                         │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
  Page Load          Scroll Top         New Message
        │                  │                  │
        ▼                  ▼                  ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐
│useChatQuery │  │useChatScroll│  │  Socket.IO Server   │
│             │  │             │  │                     │
│ GET /api/   │  │fetchNextPage│  │  emits chat:message │
│ messages    │  │             │  │                     │
└──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘
       │                │                     │
       │                │                     ▼
       │                │          ┌────────────────────┐
       │                │          │  useChatSocket     │
       │                │          │                    │
       │                │          │  Listen event      │
       │                │          └─────────┬──────────┘
       │                │                    │
       └────────────────┴────────────────────┘
                        │
                        ▼
          ┌──────────────────────────┐
          │  React Query Cache       │
          │  (In-memory store)       │
          └─────────┬────────────────┘
                    │
                    ▼
          ┌──────────────────────────┐
          │  UI Re-renders           │
          │  (Messages display)      │
          └──────────────────────────┘
```

---

## 📝 API Requirements

### Messages API Endpoint
```typescript
// GET /api/messages?channelId=xxx&cursor=xxx
{
    items: MessageWithMember[],
    nextCursor: string | undefined
}
```

### Socket.IO Events
```typescript
// Server → Client
socket.emit("chat:message", {
    channelId: string,
    message: MessageWithMember
});
```

---

## ⚙️ Configuration

### Environment Variables
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

### Socket Provider
Make sure `SocketProvider` wraps your app:
```tsx
// app/layout.tsx
<SocketProvider>
    <QueryProvider>
        {children}
    </QueryProvider>
</SocketProvider>
```

---

## 🐛 Troubleshooting

### Messages not updating in real-time?
1. Check Socket.IO connection: `useSocket().isConnected`
2. Verify event name matches: `SOCKET_EVENTS.CHAT_MESSAGE`
3. Check channelId filter in `useChatSocket`

### Infinite scroll not working?
1. Ensure `chatRef` is attached to scrollable div
2. Check `hasNextPage` is true
3. Verify API returns `nextCursor`

### Auto-scroll not working?
1. Ensure `bottomRef` is at the end of messages
2. Check `count` dependency updates on new messages
3. Verify scroll container has `overflow-y-auto`

---

## 📚 Related Files

- `lib/socket/server.ts` - Socket.IO server setup
- `lib/socket/client.ts` - Socket.IO client
- `lib/socket/types.ts` - TypeScript types
- `components/providers/socket-provider.tsx` - React context
- `pages/api/socket/io.ts` - Socket.IO API route

---

## ✅ Checklist

- [x] Socket.IO server initialized
- [x] Socket.IO client connected
- [x] useChatQuery fetches messages
- [x] useChatSocket listens for real-time updates
- [x] useChatScroll handles auto-scroll and pagination
- [x] React Query cache updates correctly
- [x] TypeScript types are correct
- [x] No duplicate messages

**🎉 All done! Your chat is now real-time with Socket.IO!**
