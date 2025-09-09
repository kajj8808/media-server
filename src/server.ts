import express from "express";
import helmet from "helmet";
import cors from "cors";

import https from "https";
import http from "http";
import fs from "fs";

import "@services/torrent";
import "@services/streaming";
import "@services/tmdb";
import {
  updateEpisodesWithKoreanDescriptions,
  updateSeasonsWithEpisodes,
} from "@services/database";
import { logServerError } from "@services/errorLogger";
import videosRouter from "@routes/api/videos";
import seasonRouter from "@routes/api/season";
import seriesRouter from "@routes/api/series";
import subtitleRouter from "@routes/api/subtitle";
import episodeRouter from "@routes/api/episode";

import imageRouter from "@routes/media/image";
import videoRouter from "@routes/media/video";
import fileUploadRouter from "@routes/api/fileUpload";
import movieRouter from "@routes/api/movie";
import userRouter from "@routes/api/user";
import { initSocket } from "socket";
import serverRouter from "@routes/api/server";
import debugRouter from "@routes/api/debug";

const app = express();
app.use(helmet());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Range"], // Range 헤더 추가
  })
);

app.use(express.json({ limit: "10mb" }));
app.options("*", cors());

app.get("/", (_, res) => {
  res.send("animation server home...");
});

app.use("/api/videos", videosRouter);
app.use("/api/season", seasonRouter);
app.use("/api/series", seriesRouter);
app.use("/api/subtitle", subtitleRouter);
app.use("/api/episodes", episodeRouter);
app.use("/api/file-upload", fileUploadRouter);
app.use("/api/movie", movieRouter);
app.use("/api/user", userRouter);
app.use("/api/server", serverRouter);
app.use("/api/debug", debugRouter);

app.use("/media/image", imageRouter);
app.use("/media/video", videoRouter);

app.use((error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logServerError(error, req.path, req.method, req.body?.userId);
  res.status(500).json({
    error: "서버 내부 오류가 발생했습니다.",
    timestamp: new Date().toISOString()
  });
});

app.use((req: express.Request, res: express.Response) => {
  logServerError(new Error(`Not found: ${req.path}`), req.path, req.method);
  res.status(404).json({
    error: "요청하신 리소스를 찾을 수 없습니다.",
    path: req.path
  });
});

let server: https.Server | http.Server;

async function startServer() {
  try {
    const httpsOptions = {
      key: fs.readFileSync("src/keys/key.pem"),
      cert: fs.readFileSync("src/keys/cert.pem"),
    };
    if (httpsOptions.key && httpsOptions.cert) {
      server = https.createServer(httpsOptions, app);
      server.listen(8443, () => {
        initSocket(server);
        console.log(`server is ready: https://localhost:8443`);
      });
    }
  } catch (error) {
    server = http.createServer(app);
    server.listen(3003, () => {
      initSocket(server);
      console.log(`http://localhost:3003`);
    });
  }
}

async function updateEpisode() {
  updateSeasonsWithEpisodes();
  updateEpisodesWithKoreanDescriptions();
}

async function main() {
  // await checkSystemRequirements();
  await startServer();
  updateEpisode();
}

async function gracefulShutdown() {
  console.log('Graceful shutdown initiated...');
  
  if (server) {
    server.close((err) => {
      if (err) {
        console.error('Error during server shutdown:', err);
        process.exit(1);
      }
      console.log('Server closed successfully');
    });

    // Force close connections after timeout
    setTimeout(() => {
      console.log('Force closing server connections...');
      server.closeAllConnections?.();
    }, 2000);

    setTimeout(() => {
      console.log('Graceful shutdown completed');
      process.exit(0);
    }, 5000);
  } else {
    console.log('No server to close, exiting...');
    process.exit(0);
  }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (error.message.includes('EADDRINUSE')) {
    console.error('Port conflict error ignored');
    return;
  }
  process.exit(1);
});

export default main;
