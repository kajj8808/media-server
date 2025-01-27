import express from "express";
import helmet from "helmet";
import cros from "cors";

import bcrypt from "bcrypt";
import zod from "zod";

import https from "https";
import http from "http";

import "@services/torrent";
import "@services/streaming";
import "@services/tmdb";
import db, {
  upsertGenres,
  upsertSeasons,
  upsertSeries,
} from "@services/database";
import { getSeries } from "@services/tmdb";

/* 
const app = express();
app.use(helmet());
app.use(cros());
app.use(express.json());
 */

async function main() {
  //77694

  // 2.a season 등록
  // 2.b movie 등록
  // 3. season 에 episode 자동 등록
  /* const series = await db.series.findMany();
  console.log(series); */
  // 1.series 등록
  const seriesId = 223251;

  const series = await getSeries(seriesId);
  if (!series) {
    return;
  }
  const updatedGenres = await upsertGenres(series.genres);
  const updatedSeries = await upsertSeries(seriesId, series, updatedGenres);
  const updatedSeasons = await upsertSeasons(series.seasons, seriesId);

  console.log(updatedSeasons);
}
main();
