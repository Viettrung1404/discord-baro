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
  const { isLoaded, isSignedIn } = useAuth();
  const activeSocketRef = useRef<TypedClientSocket | null>(null);

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

    const handleConnect = () => {
      console.info("[Socket connected]", activeSocketRef.current?.id);
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.info("[Socket disconnected]");
      setIsConnected(false);
    };

    const handleError = (error: Error & { data?: unknown }) => {
      console.error("[Socket connect_error]", error.message, error);
    };

    const initializeSocket = async () => {
      // Wait for cookies to propagate after auth
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!isMounted) {
        return;
      }

      // Warm up the socket server endpoint
      try {
        await fetch("/api/socket/io", {
          credentials: "include",
        });
      } catch (error) {
        console.error("[Socket bootstrap] Failed to warm socket endpoint", error);
      }

      if (!isMounted) {
        return;
      }

      const socketInstance = createSocket();
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
  }, [isLoaded, isSignedIn]);

  return <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>;
};
