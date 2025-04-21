import db, {
  upsertGenres,
  upsertSeasons,
  upsertSeries,
} from "@services/database";
import { getSeries } from "@services/tmdb";
import { Router } from "express";

const seriesRouter = Router();

seriesRouter.post("/insert", async (req, res) => {
  const { seriesId } = req.body;

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

seriesRouter.get("/now_playing", async (_, res) => {
  const series = await db.series.findMany({
    where: {
      updated_at: {
        gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12), // 2주 이내.
      },
    },
  });

  res.json({
    ok: true,
    result: series,
    tip: "최근 2주 이내에 업데이트 된 series 들을 가져옴.",
  });
});

export default seriesRouter;
