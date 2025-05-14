import db, {
  upsertGenres,
  upsertSeasons,
  upsertSeries,
} from "@services/database";
import { getSeries } from "@services/tmdb";
import { Router } from "express";
import { authenticateToken } from "middleware/auth";

const seriesRouter = Router();

seriesRouter.post("/insert", async (req, res) => {
  const { seriesId } = req.body;

  const series = await getSeries(seriesId);
  if (!series) {
    res.status(403).json({
      ok: true,
    });
    return;
  }

  const updatedGenres = await upsertGenres(series.genres);
  const updatedSeries = await upsertSeries(seriesId, series, updatedGenres);
  const updatedSeasons = await upsertSeasons(seriesId, series.seasons);

  res.status(200).json({
    ok: true,
  });
});

seriesRouter.get("/all", async (_, res) => {
  const series = await db.series.findMany({
    where: {
      video_content: {
        some: {},
      },
    },
  });

  res.status(200).json({
    ok: true,
    result: series,
    tip: "모든 video content가 있는 series 들을 가져옴.",
  });
});

seriesRouter.get("/now_playing", async (_, res) => {
  const series = await db.series.findMany({
    where: {
      updated_at: {
        gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6), // 1주 이내.
      },
    },
    select: {
      id: true,
      title: true,
      overview: true,
      logo: true,
      backdrop_path: true,
      updated_at: true,
    },
    orderBy: {
      updated_at: "desc",
    },
  });

  res.status(200).json({
    ok: true,
    result: series,
    tip: "최근 1주 이내에 업데이트 된 series 들을 가져옴.",
  });
});

seriesRouter.get("/bd", async (_, res) => {
  const series = await db.series.findMany({
    where: {
      season: {
        some: {
          source_type: "BD",
        },
      },
    },
    distinct: ["id"],
    select: {
      id: true,
      title: true,
      overview: true,
      logo: true,
      backdrop_path: true,
      updated_at: true,
    },
    orderBy: {
      updated_at: "desc",
    },
  });

  res.status(200).json({
    ok: true,
    result: series,
    tip: "DB series 들을 가져옴.",
  });
});

seriesRouter.get("/list", async (_, res) => {
  const series = await db.series.findMany({
    select: {
      id: true,
      title: true,
      overview: true,
      logo: true,
      backdrop_path: true,
      updated_at: true,
    },
    orderBy: {
      updated_at: "desc",
    },
  });
  res.status(200).json({
    ok: true,
    series,
    tip: "DB에 있는 series들을 모두 가져옴.",
  });
});

seriesRouter.get("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  if (isNaN(+id) || !user?.userId) {
    res.json({
      ok: false,
    });
    return undefined;
  }

  const series = await db.series.findUnique({
    where: { id: +id },
    include: {
      season: {
        include: {
          episodes: {
            include: {
              user_watch_progress: {
                where: {
                  user_id: user.userId,
                },
              },
            },
          },
        },
      },
      genres: true,

      movies: true,
    },
  });

  res.status(200).json({
    ok: true,
    series,
    tip: "series의 상세정보를 가져옴. 상세정보 : series, series에 연결된 season, episode, movie를 가져옴.",
  });
});

export default seriesRouter;
