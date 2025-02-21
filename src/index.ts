import express from "express";
import helmet from "helmet";
import cors from "cors";

import bcrypt from "bcrypt";
import zod from "zod";

import https from "https";
import http from "http";
import path from "path";
import fs from "fs";

import "@services/torrent";
import "@services/streaming";
import "@services/tmdb";
import db, {
  checkMagnetsExist,
  updateEpisodesWithKoreanDescriptions,
  updateSeason,
  updateSeasonsWithEpisodes,
  upsertEpisode,
  upsertGenres,
  upsertSeasons,
  upsertSeries,
} from "@services/database";
import { getEpisodeDetail, getSeries } from "@services/tmdb";
import { downloadVideoFileFormTorrent } from "@services/torrent";
import { getNyaaMagnets } from "@services/web-scraper";
import videoRouter from "@routes/video";
import seasonRouter from "@routes/season";
import seriesRouter from "@routes/series";
import subtitleRouter from "@routes/subtitle";
import episodeRouter from "@routes/episode";

import imageRouter from "@routes/image";
import fileUploadRouter from "@routes/fileUpload";
import movieRouter from "@routes/movie";
import { convertToStreamableVideo } from "@services/streaming";

const app = express();
app.use(helmet());
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json({ limit: "10mb" }));

app.get("/", (_, res) => {
  res.send("animation server home...");
});

app.use("/video", videoRouter);
app.use("/season", seasonRouter);
app.use("/series", seriesRouter);
app.use("/subtitle", subtitleRouter);
app.use("/episode", episodeRouter);
app.use("/image", imageRouter);
app.use("/file-upload", fileUploadRouter);
app.use("/movie", movieRouter);

async function startServer() {
  try {
    const httpsOptions = {
      key: fs.readFileSync("src/keys/key.pem"),
      cert: fs.readFileSync("src/keys/cert.pem"),
    };
    if (httpsOptions.key && httpsOptions.cert) {
      https.createServer(httpsOptions, app).listen(8443, () => {
        console.log(`https://localhost:8443`);
      });
    }
  } catch (error) {
    http.createServer(app).listen(3003, () => {
      console.log(`http://localhost:3003`);
    });
  }
}

async function main() {
  await startServer();
  /* let files = fs.readdirSync("public/temp/uma_movie.mkv");

  files = files.map(f => parseInt(f, 10)).sort((a, b) => a - b);
  const missing = [];
  
  for (let i = 0; i <= 1329; i++) {
      if (!files.includes(i)) {
          missing.push(i);
      }
  }
  
  console.log("누락된 파일 번호:", missing); */
}

setInterval(async () => {
  updateSeasonsWithEpisodes();
  updateEpisodesWithKoreanDescriptions();
}, 6 * 60 * 60 * 1000); // 6시간에 한번 다시 실행.

main();
