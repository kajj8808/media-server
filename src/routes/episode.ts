import db from "@services/database";
import { Router } from "express";

const episodeRouter = Router();

episodeRouter.get("/no-subtitles", async (_, res) => {
  const episodes = await db.episode.findMany({
    where: { subtitle_id: null },
    select: {
      id: true,
      title: true,
      number: true,
      video_id: true,
      series: {
        select: {
          title: true,
        },
      },
      season: {
        select: {
          name: true,
        },
      },
    },
  });
  res.json({ episodes });
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
