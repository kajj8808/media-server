import db, {
  createNewMagnet,
  createNewMovie,
  createVideoContent,
} from "@services/database";
import { sendAnimationMessage } from "@services/discord";
import { getMovieDetail } from "@services/tmdb";
import { downloadVideoFileFormTorrent } from "@services/torrent";
import { Router } from "express";
import { authenticateToken } from "middleware/auth";

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

movieRouter.post("/add_magnet", async (req, res) => {
  const { seriesId, magnetUrl, movieId, isIncludeSeries } = req.body;

  try {
    downloadVideoFileFormTorrent(magnetUrl).then((videoInfo) =>
      videoInfo.forEach(async (info) => {
        const movieDetail = await getMovieDetail(movieId);
        if (!movieDetail) return;

        const newMagnet = await createNewMagnet(info.magnetUrl);
        const newVideoContent = await createVideoContent({
          newMagnet: newMagnet!,
          seriesId: seriesId,
          watchId: info.videoId,
          type: "MOVIE",
        });

        const newMovie = await createNewMovie({
          info: movieDetail,
          newVideoContent: newVideoContent,
          seriesId: seriesId,
        });

        await sendAnimationMessage({
          episodeName: newMovie.title,
          episodeNumber: 0,
          imageUrl: newMovie.backdrop_path!,
          seasonName: "",
          seriesName: seriesId,
          videoContentId: newVideoContent.id,
        });

        console.log(`${info.videoId} 비디오가 성공적으로 처리 되었습니다.`);
      })
    );
  } catch (error) {
    console.error(error);
  }
});

movieRouter.get("/all", async (req, res) => {
  const movies = await db.movie.findMany({});
  res.json({
    ok: true,
    movies,
    tip: "모든 movies를 가져옵니다.",
  });
});

movieRouter.get("/:id/open-graph", async (req, res) => {
  const { id } = req.params;
  const movie = await db.movie.findUnique({
    where: {
      id: +id,
    },
    select: {
      title: true,
      backdrop_path: true,
    },
  });
  res.json({
    ok: true,
    result: movie,
  });
  return;
});

movieRouter.get("/:id", authenticateToken, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.json({
      ok: false,
      message: "bad request",
    });
    return;
  }
  const { id } = req.params;
  const movie = await db.movie.findUnique({
    where: {
      id: +id,
    },
  });
  res.json({
    ok: true,
    result: movie,
  });
  return;
});

export default movieRouter;
