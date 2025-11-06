import { Server as NetServer } from "http";
import type { NextApiRequest } from "next";

import { initSocketServer } from "@/lib/socket/server";
import { SOCKET_PATH } from "@/lib/socket/constants";
import type { NextApiResponseServerIo } from "@/type";

export const config = {
    api: {
        bodyParser: false,
    },
};

const ioHandler = (_req: NextApiRequest, res: NextApiResponseServerIo) => {
    if (!res.socket.server.io) {
        const httpServer = res.socket.server as unknown as NetServer;
        const io = initSocketServer(httpServer);
        res.socket.server.io = io;
    }

    res.status(200).json({ success: true, path: SOCKET_PATH });
};

export default ioHandler;
