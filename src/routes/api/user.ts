import db from "@services/database";
import jwt from "jsonwebtoken";
import { Router } from "express";
import { authenticateToken } from "middleware/auth";

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
    select: {
      email: true,
      avatar: true,
      membership: {
        select: {
          id: true,
          type: true,
          started_at: true,
          expires_at: true,
        },
      },
      id: true,
    },
  });

  if (user) {
    const token = jwt.sign(
      { userId: user.id },
      process.env.SERVER_SECRET_KEY!,
      {
        expiresIn: "30d",
      }
    );

    res.json({
      ok: true,
      user: {
        email: user.email,
        avatar: user.avatar,
        membership: user.membership,
        token,
      },
    });
  } else {
    res.json({
      ok: false,
      error: "not found user.",
    });
  }
});

userRouter.post("/refresh-token", (req, res) => {
  // TODO: 나중에 완성..
});

userRouter.get("/watch-progress", authenticateToken, async (req, res) => {
  const user = req.user;

  if (!user?.userId) {
    res.json({ ok: false, message: "bad request" });
    return;
  }

  const seriesProgress = await db.userWatchProgress.groupBy({
    by: ["series_id"],
    where: {
      user_id: +user.userId,
      movie_id: null,
      status: {
        not: "COMPLETED",
      },
    },
    orderBy: {
      _max: {
        updated_at: "asc",
      },
    },
    take: 5,
  });

  const episodes = [];
  for (const series of seriesProgress) {
    const videoContentProgress = await db.userWatchProgress.findFirst({
      where: {
        user_id: +user.userId,
        series_id: series.series_id,
      },
      orderBy: {
        updated_at: "desc",
      },
      select: {
        video_content_id: true,
        updated_at: true,
        total_duration: true,
        current_time: true,
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
        overview: true,
        video_content_id: true,
        season: {
          select: {
            name: true,
            season_number: true,
          },
        },
      },
    });
    episodes.push({
      ...episode,
      watched_at: videoContentProgress?.updated_at,
      total_duration: videoContentProgress?.total_duration,
      current_time: videoContentProgress?.current_time,
    });
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
      total_duration: true,
      current_time: true,
    },
  });

  const movies = [];
  for (const movieProgress of moviesProgress) {
    const movie = await db.movie.findUnique({
      where: {
        id: movieProgress.movie_id!,
      },
      select: {
        id: true,
        video_content_id: true,
        title: true,
        backdrop_path: true,
        series_id: true,
        overview: true,
      },
    });

    movies.push({
      ...movie,
      watched_at: movieProgress.updated_at,
      total_duration: movieProgress.total_duration,
      current_time: movieProgress.current_time,
    });
  }

  let cleanEpisodes = episodes.map((episode) => {
    return {
      id: episode.video_content_id,
      title: `시즌 ${episode.season?.season_number}.${episode.episode_number}화${episode?.name}`,
      backdrop_path: episode.still_path,
      overview: episode.overview,
      watched_at: episode.watched_at,
      series_id: episode.series_id,
      movie_id: null,
      total_duration: episode.total_duration,
      current_time: episode.current_time,
      type: "EPISODE",
    };
  });
  let cleanMovies = movies.map((movie) => {
    return {
      id: movie.video_content_id,
      title: movie.title,
      backdrop_path: movie.backdrop_path,
      overview: movie.overview,
      watched_at: movie.watched_at,
      series_id: movie.series_id,
      movie_id: movie.id,
      total_duration: movie.total_duration,
      current_time: movie.current_time,
      type: "MOVIE",
    };
  });

  const result = [...cleanMovies, ...cleanEpisodes].sort((a, b) => {
    const aTime = a.watched_at ? new Date(a.watched_at).getTime() : 0;
    const bTime = b.watched_at ? new Date(b.watched_at).getTime() : 0;
    return aTime - bTime;
  });

  res.json({
    ok: true,
    contents: result,
    tip: "user watching contents",
  });
});

userRouter.post("/watch-record", authenticateToken, async (req, res) => {
  const { watchId, duration, currentTime } = req.body;
  const user = req.user;

  if (!duration || currentTime === 0 || !user) {
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
      user_id: user.userId,
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
        user_id: user.userId,
        video_content_id: videoContet.id,
      },
    },
  });
  res.send("ok");
});

export default userRouter;
