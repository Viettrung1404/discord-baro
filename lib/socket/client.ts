"use client";

import { io, Socket as ClientSocket } from "socket.io-client";
import type { ManagerOptions, SocketOptions } from "socket.io-client";

import { SOCKET_PATH } from "./constants";
import type { ClientToServerEvents, ServerToClientEvents } from "./types";

export type TypedClientSocket = ClientSocket<ServerToClientEvents, ClientToServerEvents>;
type CreateSocketOptions = {
  token?: string;
};

const baseOptions: Partial<ManagerOptions & SocketOptions> = {
  path: SOCKET_PATH,
  transports: ["websocket"],
  autoConnect: true,
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 8,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
};

export const createSocket = ({ token }: CreateSocketOptions = {}): TypedClientSocket => {
  const url = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  const options: Partial<ManagerOptions & SocketOptions> = {
    ...baseOptions,
    auth: token ? { token } : undefined,
  };

  if (url) {
    return io(url, options) as TypedClientSocket;
  }

  return io(options) as TypedClientSocket;
};
