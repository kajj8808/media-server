import db from "@services/database";
import { Router } from "express";

const userRouter = Router();

interface LoginBody {
  email: string;
}

userRouter.post("/log-in", async (req, res) => {
  const { email } = req.body as LoginBody;

  const user = await db.user.findFirst({
    where: {
      AND: [{ email: email }, { membership: { expires_at: null } }],
    },
    include: {
      membership: true,
    },
  });

  if (user) {
    res.json({
      ok: true,
      user: user,
    });
  } else {
    res.json({
      ok: false,
      error: "not found user.",
    });
  }
});

userRouter.post("/watch-record", async (req, res) => {
  const { watchId, duration, currentTime, userId } = req.body;

  const videoContet = await db.videoContent.findFirst({
    where: {
      watch_id: watchId,
    },
    include: {
      movie: true,
      episode: true,
    },
  });
  if (!videoContet) {
    res.json({
      ok: false,
      message: "Bad Request...",
    });
    return;
  }
  // 95퍼센트 이상 보았다면 completed상태로 저장.
  const watchStatus =
    (currentTime / duration) * 100 > 95 ? "COMPLETED" : "WATCHING";
  const episodeId = videoContet.episode?.id;
  const movieId = videoContet.movie?.id;
  const seasonId = videoContet.season_id;
  const seriesId = videoContet.series_id;
  await db.userWatchProgress.upsert({
    create: {
      video_content_id: videoContet.id,
      user_id: userId,
      current_time: currentTime,
      total_duration: duration,
      status: watchStatus,
      episode_id: episodeId,
      movie_id: movieId,
      season_id: seasonId,
      series_id: seriesId,
    },
    update: {
      current_time: currentTime,
    },
    where: {
      user_id_video_content_id: {
        user_id: userId,
        video_content_id: videoContet.id,
      },
    },
  });
  res.send("ok");
});

export default userRouter;
