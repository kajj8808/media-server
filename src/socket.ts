import { Server } from "socket.io";

import { type Server as HttpServer } from "http";
import { type Server as HttpsServer } from "https";

let socketServer: Server;

export function initSocket(server: HttpsServer | HttpServer) {
  socketServer = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });
  socketServer.on("connection", (socket) => {
    console.log(socket.id)
  });
}
