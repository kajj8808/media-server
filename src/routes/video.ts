import path from "path";
import fs from "fs";
import { Readable } from "stream";
import { Router } from "express";
import { DIR_NAME } from "utils/constants";
import multer from "multer";
import { number } from "zod";
import { convertToStreamableVideo } from "@services/streaming";
import db from "@services/database";

const videoRouter = Router();

interface VideoStremInfoOption {
  start?: number;
  end?: number;
}

videoRouter.get("/video-content/no-subtitles", async (_, res) => {
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

videoRouter.get("/video-content/:id", async (req, res) => {
  const { id } = req.params;
  console.log("id?");
  try {
    const videoContent = await db.videoContent.findUnique({
      where: { id: +id },
      include: {
        episode: true,
        movie: true,
      },
    });

    if (!videoContent) {
      res
        .status(404)
        .json({ ok: false, error: "비디오 콘텐츠를 찾을 수 없습니다." });
    }

    res.json({
      ok: true,
      result: videoContent,
      type: videoContent?.movie ? "MOVIE" : "EPISODE",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: "서버 오류가 발생했습니다." });
  }
});

videoRouter.get("/:id", async (req, res) => {
  const id = req.params.id; //or use req.param('id')

  const filePath = path.join(DIR_NAME, "../../", "public", "video", id);

  // Listing 3.
  const options: VideoStremInfoOption = {};

  let start: number | undefined;
  let end: number | undefined;

  const range = req.headers.range;
  if (range) {
    const bytesPrefix = "bytes=";
    if (range.startsWith(bytesPrefix)) {
      const bytesRange = range.substring(bytesPrefix.length);
      const parts = bytesRange.split("-");
      if (parts.length === 2) {
        const rangeStart = parts[0] && parts[0].trim();
        if (rangeStart && rangeStart.length > 0) {
          options.start = start = parseInt(rangeStart);
        }
        const rangeEnd = parts[1] && parts[1].trim();
        if (rangeEnd && rangeEnd.length > 0) {
          options.end = end = parseInt(rangeEnd);
        }
      }
    }
  }

  res.setHeader("content-type", "video/mp4");

  fs.stat(filePath, (err, stat) => {
    if (err) {
      console.error(`File stat error for ${filePath}.`);
      console.error(err);
      res.sendStatus(500);
      return;
    }

    let contentLength = stat.size;

    // Listing 4.
    if (req.method === "HEAD") {
      res.statusCode = 200;
      res.setHeader("accept-ranges", "bytes");
      res.setHeader("content-length", contentLength);
      res.end();
    } else {
      // Listing 5.
      let retrievedLength;
      if (start !== undefined && end !== undefined) {
        retrievedLength = end + 1 - start;
      } else if (start !== undefined) {
        retrievedLength = contentLength - start;
      } else if (end !== undefined) {
        retrievedLength = end + 1;
      } else {
        retrievedLength = contentLength;
      }

      // Listing 6.
      res.statusCode = start !== undefined || end !== undefined ? 206 : 200;

      res.setHeader("content-length", retrievedLength);

      if (range !== undefined) {
        res.setHeader(
          "content-range",
          `bytes ${start || 0}-${end || contentLength - 1}/${contentLength}`
        );
        res.setHeader("accept-ranges", "bytes");
      }

      // Listing 7.
      const fileStream = fs.createReadStream(filePath, options);
      fileStream.on("error", (error) => {
        if (!res.headersSent) {
          res.status(500).send("Error while reading the file.");
        } else {
          console.error(`Error reading file after headers sent ${filePath}.`);
        }
      });
      fileStream.pipe(res);
    }
  });
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
