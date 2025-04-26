import path from "path";
import fs from "fs";

import { Router } from "express";
import multer from "multer";

import { convertToStreamableVideo } from "@services/streaming";
import db from "@services/database";

const videoRouter = Router();

videoRouter.get("/no-subtitle", async (_, res) => {
  const episodes = await db.videoContent.findMany({
    where: { AND: [{ subtitle_id: null }] },
    include: {
      episode: true,
      movie: true,
      season: true,
      series: true,
    },
    orderBy: {
      updated_at: "desc",
    },
  });
  res.json({ episodes });
});

videoRouter.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(+id)) {
    res.status(400).json({ error: "유효한 id가 필요합니다." });
    return;
  }

  try {
    const videoContent = await db.videoContent.findUnique({
      where: { id: +id },
      include: {
        season: true,
        series: true,
        episode: true,
        movie: true,
      },
    });

    let nextEpisode;
    if (videoContent?.episode && videoContent.season) {
      nextEpisode = await db.episode.findFirst({
        where: {
          season_id: videoContent?.season?.id,
          episode_number: videoContent?.episode?.episode_number + 1,
        },
      });
    }

    if (!videoContent) {
      res
        .status(404)
        .json({ ok: false, error: "비디오 콘텐츠를 찾을 수 없습니다." });
    }

    res.json({
      ok: true,
      result: nextEpisode ? { ...videoContent, nextEpisode } : videoContent,
      type: videoContent?.movie ? "MOVIE" : "EPISODE",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: "서버 오류가 발생했습니다." });
  }
});

const videoUpload = multer({
  dest: path.join("public", "temp"),
});

videoRouter.post("/upload", videoUpload.single("blob"), async (req, res) => {
  const { fileName, fileIndex, chunks, mediaType } = req.body as {
    fileName?: string;
    fileIndex?: string;
    chunks?: string;
    mediaType?: string;
  };

  const file = req.file;

  if (!file || !fileIndex || !fileName || !chunks || !mediaType) {
    res.status(400).json({
      ok: false,
      error: "Bad Request",
    });
    return;
  }

  if (mediaType === "video" || mediaType === "image") {
    const tempDir = path.join("public", "temp", fileName);
    const tempPath = path.join(tempDir, fileIndex);

    if (!fs.existsSync(tempPath)) {
      try {
        fs.mkdirSync(tempDir);
      } catch (error) {}
    }

    fs.renameSync(file.path, tempPath);

    const files = fs.readdirSync(tempDir);
    if (files.length === +chunks) {
      // 0 , 1 , 10 <- 이렇게 나오는 문제가 있어서..
      const sortedFiles = files
        .map(Number)
        .sort((a, b) => a - b)
        .map(String);
      for (const file of sortedFiles) {
        const fileData = fs.readFileSync(path.join(tempDir, file));
        fs.appendFileSync(path.join("public", mediaType, fileName), fileData);
      }
      if (mediaType === "video") {
        const newFileName = await convertToStreamableVideo(
          path.join("public", "video", fileName)
        );
        fs.rmSync(path.join("public", "temp", fileName), {
          recursive: true,
        });
        res.json({ ok: true, fileName: newFileName });
      }
    } else {
      res.json({ ok: true, len: files.length, chunks: chunks });
    }
  } else {
    res.status(400).json({
      ok: false,
      error: "Bad Request",
    });
  }
});

export default videoRouter;
