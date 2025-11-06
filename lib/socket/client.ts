"use client";

import { io, Socket as ClientSocket } from "socket.io-client";
import type { ManagerOptions, SocketOptions } from "socket.io-client";

import { SOCKET_PATH } from "./constants";
import type { ClientToServerEvents, ServerToClientEvents } from "./types";

export type TypedClientSocket = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

const baseOptions: Partial<ManagerOptions & SocketOptions> = {
  path: SOCKET_PATH,
  transports: ["websocket"],
  autoConnect: true,
  withCredentials: true,
};

export const createSocket = (): TypedClientSocket => {
  const url = process.env.NEXT_PUBLIC_SOCKET_URL;

  if (url) {
    return io(url, baseOptions) as TypedClientSocket;
  }

  return io(baseOptions) as TypedClientSocket;
};
