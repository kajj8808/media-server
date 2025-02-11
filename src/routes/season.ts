import db, { addEpisodes, updateSeason } from "@services/database";
import { Router } from "express";

const seasonRouter = Router();

seasonRouter.get("/list/not-nyaa", async (req, res) => {
  try {
    const seasons = await db.season.findMany({
      where: { nyaa_query: null },
      select: {
        id: true,
        name: true,
        number: true,
        series: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { update_at: "desc" },
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
        number: true,
        series: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { update_at: "desc" },
    });
    res.json({ seasons });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

seasonRouter.post("/add_nyaa", async (req, res) => {
  const { seasonId, nyaaQuery, is_4k, is_db } = req.body;

  if (!seasonId || !nyaaQuery) {
    res.status(400).send({ error: "seasonId와 nyaaQuery는 필수입니다." });
    return;
  }

  await updateSeason({
    auto_upload: true,
    is_4k,
    is_db,
    nyaa_query: nyaaQuery,
    seasonId,
  });
  addEpisodes(seasonId, nyaaQuery);

  res.status(200).json({ message: "에피소드 추가 작업이 시작되었습니다." });
});

export default seasonRouter;
