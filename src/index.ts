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
  updateSeason,
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

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/", (_, res) => {
  res.send("animation server home...");
});

app.use("/video", videoRouter);
app.use("/season", seasonRouter);
app.use("/series", seriesRouter);
app.use("/subtitle", subtitleRouter);
app.use("/episode", episodeRouter);

export async function addEpisodes(seasonId: number, nyaaQuery: string) {
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
