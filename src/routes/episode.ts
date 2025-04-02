import db from "@services/database";
import { Router } from "express";

const episodeRouter = Router();

episodeRouter.get("/new", async (_, res) => {
  const episodes = await db.episode.findMany({
    take: 20,
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

  await db.episode.create({
    data: {
      title: data.title,
      description: data.description,
      thumbnail: data.thumbnail,
      running_time: +data.running_time,
      number: +data.number,
      video_id: data.videoId,
      season_id: +data.seasonId,
      series_id: +data.seriesId,
      kr_description: true,
    },
  });

  res.status(200).json({
    ok: true,
  });
});

export default episodeRouter;
