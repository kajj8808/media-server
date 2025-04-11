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

  /* const videoConent = await db.videoContent.create({
    data: {
      type: "MOVIE",
      watch_id: data.videoId,
    },
  }); */

  console.log(data);

  /*   await db.movie.create({
    data: {
      title: DATA
      video_content_id: videoConent.id,
    },
  }); */

  res.status(200).json({
    ok: true,
  });
});

export default movieRouter;
