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

userRouter.get("/watch-progress", async (req, res) => {
  //const { userId } = req.body;
  const userId = 2;
  if (!userId) {
    res.json({ ok: false, message: "bad request" });
    return;
  }

  const seriesProgress = await db.userWatchProgress.groupBy({
    by: ["series_id", "updated_at"],
    where: {
      user_id: +userId,
      movie_id: null,
      status: {
        not: "COMPLETED",
      },
    },
    orderBy: {
      updated_at: "desc",
    },
    take: 3,
  });

  const episodes = [];
  for (const series of seriesProgress) {
    const videoContentProgress = await db.userWatchProgress.findFirst({
      where: {
        user_id: +userId,
        series_id: series.series_id,
      },
      orderBy: {
        updated_at: "desc",
      },
      select: {
        video_content_id: true,
        updated_at: true,
      },
      take: 1,
    });
    const episode = await db.episode.findFirst({
      where: {
        video_content_id: videoContentProgress?.video_content_id,
      },
      select: {
        name: true,
        still_path: true,
        series_id: true,
        episode_number: true,
        season: {
          select: {
            name: true,
            season_number: true,
          },
        },
      },
    });
    episodes.push({ ...episode, watched_at: videoContentProgress?.updated_at });
  }

  const moviesProgress = await db.userWatchProgress.findMany({
    where: {
      status: {
        not: "COMPLETED",
      },
      movie_id: {
        not: null,
      },
    },
    take: 2,
    select: {
      movie_id: true,
      updated_at: true,
    },
  });

  const movies = [];
  for (const movieProgress of moviesProgress) {
    const movie = await db.movie.findUnique({
      where: {
        id: movieProgress.movie_id!,
      },
      select: {
        backdrop_path: true,
        title: true,
        id: true,
        series_id: true,
      },
    });

    movies.push({ ...movie, watched_at: movieProgress.updated_at });
  }

  let cleanEpisodes = episodes.map((episode) => {
    return {
      title: `시즌 ${episode.season?.season_number}.${episode.episode_number}화${episode?.name}`,
      backdrop_path: episode.still_path,
      watched_at: episode.watched_at,
      series_id: episode.series_id,
      movie_id: null,
      type: "EPISODE",
    };
  });
  let cleanMovies = movies.map((moive) => {
    return {
      title: moive.title,
      backdrop_path: moive.backdrop_path,
      watched_at: moive.watched_at,
      series_id: moive.series_id,
      movie_id: moive.id,
      type: "MOVIE",
    };
  });
  const result = [...cleanMovies, ...cleanEpisodes];

  res.json({
    ok: true,
    contents: result,
    tip: "user watching contents",
  });
});

userRouter.post("/watch-record", async (req, res) => {
  const { watchId, duration, currentTime, userId } = req.body;

  if (!duration || currentTime === 0) {
    res.json({
      ok: false,
      message: "duration or current time is null or 0",
    });
    return;
  }

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
  // 85퍼센트 이상 보았다면 completed상태로 저장.
  const watchStatus =
    (currentTime / duration) * 100 > 85 ? "COMPLETED" : "WATCHING";
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
      status: watchStatus,
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
