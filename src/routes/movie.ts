import db from "@services/database";
import { Router } from "express";

const movieRouter = Router();

interface InsertBody {
  title: string;
  description: string;
  poster: string;
  thumbnail: string;
  runningTime: string;
  videoId: string;
  seriesId: string;
}

movieRouter.post("/insert", async (req, res) => {
  const data = req.body as InsertBody;

  await db.movie.create({
    data: {
      title: data.title,
      description: data.description,
      poster: data.poster,
      thumbnail: data.thumbnail,
      running_time: +data.runningTime,
      video_id: data.videoId,
      series_id: data.seriesId ? +data.seriesId : null,
      kr_description: true,
    },
  });

  res.status(200).json({
    ok: true,
  });
});

export default movieRouter;
