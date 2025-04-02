import db, { handleEpisodeTorrents, updateSeason } from "@services/database";
import { Router } from "express";
import { convertPlaintextToCipherText } from "utils/lib";

const seasonRouter = Router();

seasonRouter.get("/list/not-nyaa", async (req, res) => {
  try {
    const seasons = await db.season.findMany({
      where: { nyaa_query: null },
      select: {
        id: true,
        name: true,
        season_number: true,
        series: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { updated_at: "desc" },
    });
    res.json({ seasons });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

seasonRouter.get("/list", async (req, res) => {
  try {
    const seasons = await db.season.findMany({
      select: {
        id: true,
        name: true,
        season_number: true,
        series: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { updated_at: "desc" },
    });
    res.json({ seasons });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

seasonRouter.post("/add_nyaa", async (req, res) => {
  const { seasonId, nyaaQuery } = req.body;

  if (!seasonId || !nyaaQuery) {
    res.status(400).send({ error: "seasonId와 nyaaQuery는 필수입니다." });
    return;
  }

  const newSeason = await updateSeason({
    auto_upload: true,
    nyaa_query: nyaaQuery,
    seasonId,
  });

  handleEpisodeTorrents({
    seasonId: newSeason.id,
    seriesId: newSeason.series_id!,
    nyaaQuery: nyaaQuery,
  });

  res.status(200).json({ message: "에피소드 추가 작업이 시작되었습니다." });
});

seasonRouter.post("/add_magnet", async (req, res) => {
  const { seasonId, magnetUrl, is_4k, is_db } = req.body;

  if (!seasonId || !magnetUrl) {
    res.status(400).send({ error: "seasonId와 magnetUrl는 필수입니다." });
    return;
  }
  await updateSeason({
    auto_upload: true,
    is_4k,
    is_db,
    seasonId,
  });

  addEpisodes({ seasonId, magnetUrl });

  res.status(200).json({ message: "에피소드 추가 작업이 시작되었습니다." });
});

export default seasonRouter;
