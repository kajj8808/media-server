import express from "express";
import helmet from "helmet";
import cors from "cors";

import https from "https";
import http from "http";
import fs from "fs";

import "@services/torrent";
import "@services/streaming";
import "@services/tmdb";
import db, {
  updateEpisodesWithKoreanDescriptions,
  updateSeasonsWithEpisodes,
  upsertGenres,
  upsertSeasons,
  upsertSeries,
} from "@services/database";
import videoRouter from "@routes/video";
import seasonRouter from "@routes/season";
import seriesRouter from "@routes/series";
import subtitleRouter from "@routes/subtitle";
import episodeRouter from "@routes/episode";

import imageRouter from "@routes/image";
import fileUploadRouter from "@routes/fileUpload";
import movieRouter from "@routes/movie";

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

async function updateEpisode() {
  updateSeasonsWithEpisodes();
  updateEpisodesWithKoreanDescriptions();
}

/* async function main() {
  await startServer();
  updateEpisode();
}

setInterval(async () => {
  updateEpisode();
}, 24 * 60 * 60 * 1000); // 24시간에 한번 다시 실행.

main();
 */

import csv from "csv-parser";
import { createReadStream } from "fs";
import { getSeries } from "@services/tmdb";

async function migrateDataFromSupabase() {
  // series
  /* interface MediaItem {
    id: string;
    title: string;
    overview: string;
    cover_image: string;
    logo: string;
    poster: string;
    is_game_original: string;
    is_novel_original: string;
    is_manga_original: string;
    homepage: string;
    next_episode_to_air: string;
    original_name: string;
    create_at: string;
    update_at: string;
  }

  const results: MediaItem[] = [];
  createReadStream("./src/Series_rows.csv")
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      for (const result of results) {
        await db.series.create({
          data: {
            id: +result.id,
            title: result.title,
            overview: result.overview,
            status: "COMPLETED",
            backdrop_path: result.cover_image,
            poster_path: result.poster,
          },
        });
      }
    }); */
  // magnet...
  /*  const results: any[] = [];
  createReadStream("./src/Magnet_rows.csv")
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      for (const result of results) {
        console.log(result);
      }
    }); */
  interface MediaItem {
    id: string;
    title: string;
    overview: string;
    cover_image: string;
    logo: string;
    poster: string;
    is_game_original: string;
    is_novel_original: string;
    is_manga_original: string;
    homepage: string;
    next_episode_to_air: string;
    original_name: string;
    create_at: string;
    update_at: string;
  }

  const results: MediaItem[] = [];

  createReadStream("./src/Series_rows.csv")
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      /*   for (const result of results) {
        const series = await getSeries(+result.id);
        if (!series) {
          continue;
        }
        const updatedGenres = await upsertGenres(series.genres);
        const updatedSeries = await upsertSeries(
          series.id,
          series,
          updatedGenres
        );
        const updatedSeasons = await upsertSeasons(series.id, series.seasons);
      } */
    });
}

migrateDataFromSupabase();
