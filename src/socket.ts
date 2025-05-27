import { Server, Socket } from "socket.io";

import { type Server as HttpServer } from "http";
import { type Server as HttpsServer } from "https";

interface CustomSocket extends Socket {
  roomName?: string;
}

let socketServer: Server;

export function initSocket(server: HttpsServer | HttpServer) {
  socketServer = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });
  socketServer.on("connection", (socket: CustomSocket) => {
    socket.on("joinRoom", (roomName) => {
      socket.join(roomName);
      socket.roomName = roomName;
    });
    socket.on("timeUpdate", (time) => {
      if (socket.roomName) {
        socket.to(socket.roomName).emit("timeUpdate", time);
      }
    });
    socket.on("pause", () => {
      if (socket.roomName) {
        socket.to(socket.roomName).emit("pause");
      }
    });
    socket.on("play", () => {
      if (socket.roomName) {
        socket.to(socket.roomName).emit("play");
      }
    });
  });
}
