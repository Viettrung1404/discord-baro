"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";

import { createSocket, type TypedClientSocket } from "@/lib/socket/client";

type SocketContextType = {
  socket: TypedClientSocket | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<TypedClientSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const activeSocketRef = useRef<TypedClientSocket | null>(null);
  const isRefreshingAuthRef = useRef(false);
  const authRetryCountRef = useRef(0);
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  const useExternalSocketServer = Boolean(socketUrl);

  useEffect(() => {
    let isMounted = true;

    const teardownSocket = () => {
      const existing = activeSocketRef.current;
      if (existing) {
        existing.off("connect");
        existing.off("disconnect");
        existing.off("connect_error");
        existing.disconnect();
        activeSocketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }

      isRefreshingAuthRef.current = false;
      authRetryCountRef.current = 0;
    };

    if (!isLoaded) {
      return () => {
        isMounted = false;
      };
    }

    if (!isSignedIn) {
      teardownSocket();
      return () => {
        isMounted = false;
      };
    }

    const isAuthConnectError = (error: Error & { data?: unknown }) => {
      const message = error.message.toLowerCase();
      if (message.includes("unauthorized") || message.includes("expired") || message.includes("token")) {
        return true;
      }

      if (error.data && typeof error.data === "object") {
        const maybeReason = (error.data as { reason?: unknown }).reason;
        if (typeof maybeReason === "string") {
          const reason = maybeReason.toLowerCase();
          return reason.includes("unauthorized") || reason.includes("expired") || reason.includes("token");
        }
      }

      return false;
    };

    const refreshTokenAndReconnect = async (reason: string) => {
      const currentSocket = activeSocketRef.current;
      if (!currentSocket) {
        return;
      }

      if (isRefreshingAuthRef.current) {
        return;
      }

      if (authRetryCountRef.current >= 3) {
        console.error("[Socket auth] Max token refresh retries reached. Please sign out/in again.");
        return;
      }

      isRefreshingAuthRef.current = true;
      authRetryCountRef.current += 1;

      try {
        const refreshedToken = await getToken({ skipCache: true } as any);

        if (!refreshedToken) {
          console.error("[Socket auth] Failed to refresh Clerk token", { reason });
          return;
        }

        const currentAuth =
          typeof currentSocket.auth === "object" && currentSocket.auth !== null
            ? currentSocket.auth
            : {};

        currentSocket.auth = {
          ...currentAuth,
          token: refreshedToken,
        };

        console.info("[Socket auth] Token refreshed. Reconnecting socket", {
          reason,
          attempt: authRetryCountRef.current,
        });

        if (!currentSocket.connected) {
          currentSocket.connect();
        }
      } catch (error) {
        console.error("[Socket auth] Failed to refresh token for socket reconnect", error);
      } finally {
        isRefreshingAuthRef.current = false;
      }
    };

    const handleConnect = () => {
      console.info("[Socket connected]", activeSocketRef.current?.id);
      setIsConnected(true);
      authRetryCountRef.current = 0;
    };

    const handleDisconnect = (reason: string) => {
      console.info("[Socket disconnected]", reason);
      setIsConnected(false);

      if (reason !== "io client disconnect") {
        void refreshTokenAndReconnect(`disconnect:${reason}`);
      }
    };

    const handleError = (error: Error & { data?: unknown }) => {
      setIsConnected(false);
      console.error("[Socket connect_error]", error.message, error);

      if (isAuthConnectError(error)) {
        void refreshTokenAndReconnect("connect_error");
      }

      if (useExternalSocketServer) {
        console.info("[Socket connect_error] External socket URL:", socketUrl);
      } else {
        console.info("[Socket connect_error] Using same-origin /api/socket/io. On Vercel, use NEXT_PUBLIC_SOCKET_URL to point to a persistent Node socket server.");
      }
    };

    const initializeSocket = async () => {
      // Wait for cookies to propagate after auth
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!isMounted) {
        return;
      }

      // Only warm same-origin API socket endpoint when not using external socket server.
      if (!useExternalSocketServer) {
        try {
          await fetch("/api/socket/io", {
            credentials: "include",
          });
        } catch (error) {
          console.error("[Socket bootstrap] Failed to warm socket endpoint", error);
        }
      }

      if (!isMounted) {
        return;
      }

      let token: string | null = null;
      try {
        token = await getToken();
      } catch (error) {
        console.error("[Socket auth] Failed to get Clerk token", error);
      }

      const socketInstance = createSocket({ token: token || undefined });
      activeSocketRef.current = socketInstance;
      socketInstance.on("connect", handleConnect);
      socketInstance.on("disconnect", handleDisconnect);
      socketInstance.on("connect_error", handleError);

      setSocket(socketInstance);
    };

    initializeSocket();

    return () => {
      isMounted = false;
      teardownSocket();
    };
  }, [isLoaded, isSignedIn, getToken]);

  return <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>;
};
