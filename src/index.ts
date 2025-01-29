import express from "express";
import helmet from "helmet";
import cors from "cors";

import bcrypt from "bcrypt";
import zod from "zod";

import https from "https";
import http from "http";

import "@services/torrent";
import "@services/streaming";
import "@services/tmdb";
import db, {
  checkMagnetsExist,
  upsertEpisode,
  upsertGenres,
  upsertSeasons,
  upsertSeries,
} from "@services/database";
import { getEpisodeDetail, getSeries } from "@services/tmdb";
import { downloadVideoFileFormTorrent } from "@services/torrent";
import { getNyaaMagnets } from "@services/web-scraper";
import videoRouter from "@routes/video";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/", (_, res) => {
  res.send("animation server home...");
});

app.post("/season/add_nyaa", async (req, res) => {
  const { seasonId, nyaaQuery } = req.body;
  console.log(seasonId, nyaaQuery);
  if (!seasonId || !nyaaQuery) {
    res.status(400).send({ error: "seasonId와 nyaaQuery는 필수입니다." });
    return;
  }

  res.status(200).json({ message: "에피소드 추가 작업이 시작되었습니다." });

  addEpisodes(seasonId, nyaaQuery);
});

app.use("/video", videoRouter);

async function upsertSeriesById(seriesId: number) {
  const series = await getSeries(seriesId);
  if (!series) {
    return;
  }

  const updatedGenres = await upsertGenres(series.genres);
  const updatedSeries = await upsertSeries(seriesId, series, updatedGenres);
  const updatedSeasons = await upsertSeasons(seriesId, series.seasons);
  console.log(updatedSeasons);
}

async function addEpisodes(seasonId: number, nyaaQuery: string) {
  try {
    const nyaaMagnets = await getNyaaMagnets(nyaaQuery);
    const magnets = await checkMagnetsExist(nyaaMagnets);

    const videoInfos = await Promise.all(
      magnets.map(async (magnetUrl) => {
        return await downloadVideoFileFormTorrent(magnetUrl);
      })
    );

    for (let videoInfo of videoInfos) {
      for (let info of videoInfo) {
        await upsertEpisode({
          episodeNumber: info.episodeNumber,
          magnetUrl: info.magnetUrl,
          seasonId: seasonId,
          videoId: info.videoId,
        });
      }
    }

    console.log("에피소드가 성공적으로 추가되었습니다.");
  } catch (error) {
    console.error(error);
  }
}

async function main() {
  app.listen(4000, () => {
    console.log(`http://localhost:4000`);
  });
}
main();
