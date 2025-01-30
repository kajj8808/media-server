import { upsertGenres, upsertSeasons, upsertSeries } from "@services/database";
import { getSeries } from "@services/tmdb";
import { Router } from "express";

const seriesRouter = Router();

seriesRouter.post("/insert", async (req, res) => {
  const { seriesId } = req.body;
  console.log(req.body);
  const series = await getSeries(seriesId);
  if (!series) {
    res.status(403).json({
      ok: true,
    });
    return;
  }

  const updatedGenres = await upsertGenres(series.genres);
  const updatedSeries = await upsertSeries(seriesId, series, updatedGenres);
  const updatedSeasons = await upsertSeasons(seriesId, series.seasons);

  res.json({
    ok: true,
  });
});

export default seriesRouter;
