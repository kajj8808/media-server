import path from "path";
import fs from "fs";

import { Router } from "express";
import multer from "multer";

import { convertToStreamableVideo } from "@services/streaming";
import db from "@services/database";
import { authenticateToken } from "middleware/auth";

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

videoRouter.get("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  if (!id || isNaN(+id) || !user) {
    res.status(400).json({ error: "유효한 요청이 아닙니다." });
    return;
  }

  try {
    const videoContent = await db.videoContent.findUnique({
      where: { id: +id },
      select: {
        id: true,
        opening_start: true,
        opening_end: true,
        ending_start: true,
        ending_end: true,
        watch_id: true,
        subtitle_id: true,
        episode: {
          select: {
            episode_number: true,
            name: true,
          },
        },
        season: {
          select: {
            id: true,
            name: true,
          },
        },
        series: {
          select: {
            id: true,
            title: true,
            status: true,
            season: {
              select: {
                id: true,
                name: true,
                season_number: true,
                updated_at: true,
                episodes: {
                  select: {
                    id: true,
                    name: true,
                    overview: true,
                    runtime: true,
                    updated_at: true,
                    still_path: true,
                    episode_number: true,
                    video_content_id: true,
                    user_watch_progress: {
                      where: {
                        user_id: user.userId,
                      },
                      select: {
                        total_duration: true,
                        current_time: true,
                      },
                    },
                  },
                  orderBy: {
                    episode_number: "asc",
                  },
                },
              },
            },
          },
        },

        movie: true,
      },
    });

    if (!videoContent) {
      res.json({
        ok: false,
        message: "video content not found...",
      });
      return;
    }

    const userWatchProgress = await db?.userWatchProgress.findFirst({
      where: {
        AND: {
          user_id: 2,
          video_content_id: videoContent.id,
        },
      },
      select: {
        current_time: true,
        total_duration: true,
      },
    });

    let nextEpisode;
    if (videoContent?.episode && videoContent.season) {
      nextEpisode = await db.episode.findFirst({
        where: {
          season_id: videoContent?.season?.id,
          episode_number: videoContent?.episode?.episode_number + 1,
        },
        select: {
          id: true,
          video_content_id: true,
        },
      });
    }

    res.json({
      ok: true,
      result: nextEpisode
        ? {
            ...videoContent,
            next_episode: nextEpisode,
            user_progress: userWatchProgress,
          }
        : { ...videoContent, user_progress: userWatchProgress },
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
