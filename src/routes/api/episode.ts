import db from "@services/database";
import { Router } from "express";

const episodeRouter = Router();

episodeRouter.get("/new", async (_, res) => {
  const episodes = await db.episode.findMany({
    take: 5,
    include: {
      season: true,
      series: true,
    },
    orderBy: {
      updated_at: "desc",
    },
  });

  res.json({
    ok: true,
    result: episodes,
  });
});

interface InsertBody {
  title: string;
  description: string;
  thumbnail: string;
  running_time: string;
  number: string;
  videoId: string;
  seasonId: string;
  seriesId: string;
}
episodeRouter.post("/insert", async (req, res) => {
  const data = req.body as InsertBody;

  const season = await db.season.findUnique({
    where: {
      id: +data.seasonId,
    },
    include: {
      series: true,
    },
  });

  if (!season) {
    res.status(200).json({
      ok: true,
      error: "season 이 존재하지 않습니 다..",
    });
    return;
  }
  const videoContent = await db.videoContent.create({
    data: {
      type: "EPISODE",
      watch_id: data.videoId,
      season_id: season.id,
      series_id: season.series?.id,
    },
  });

  await db.episode.create({
    data: {
      still_path: data.thumbnail ? data.thumbnail : null,
      episode_number: +data.number,
      season_id: season.id,
      series_id: season.series_id!,
      video_content_id: videoContent.id,
      is_korean_translated: false,
    },
  });

  res.status(200).json({
    ok: true,
  });
});

export default episodeRouter;
