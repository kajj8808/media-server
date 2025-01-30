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

export default episodeRouter;
