import "dotenv/config";

import express from "express";
import smi2vtt from "smi2vtt";
import multer from "multer";
import subsrt from "subsrt";
import cors from "cors";
import path from "path";
import fs from "fs";
import db from "./lib/db";
import "./lib/auto";

import { autoInseartSeries } from "./tmdb";
import { VideoStremInfoOption } from "../types/interface";
import { extractEpisodeNumber } from "./lib/torrent";
import { changePath } from "./lib/utile";
import { addSubtitleToVideo } from "./lib/ffmpeg";

const app = express();
const subtitleUpload = multer({
  dest: path.join(__dirname, "../public", "subtitle"),
});

app.use(cors());
app.use(express.json());

app.get("/auto_episode", (_, res) => {
  const filePath = path.join(__dirname, "pages", "auto_episode.html");
  res.sendFile(filePath);
});

app.get("/auto_series", (_, res) => {
  const filePath = path.join(__dirname, "pages", "auto_series.html");
  res.sendFile(filePath);
});

app.get("/upload_smi", (_, res) => {
  const filePath = path.join(__dirname, "pages", "upload_subtitle.html");
  res.sendFile(filePath);
});

app.get("/series", async (_, res) => {
  const series = await db.series.findMany({
    orderBy: {
      id: "desc",
    },
  });
  res.json(series);
});

app.post("/season", async (req, res) => {
  const { seriesId } = req.body;
  const season = await db.season.findMany({
    where: {
      seriesId: +seriesId,
    },
  });
  res.json(season);
});

app.post("/episode", async (req, res) => {
  const { seasonId } = req.body;

  const result = await db.season.findUnique({
    where: {
      id: +seasonId,
    },
    include: {
      episodes: true,
    },
  });

  if (!result || !result.episodes) {
    return res.status(404).json({ error: "No episodes found" });
  }

  const episodes = result.episodes.map((episode) => ({
    ...episode,
    videoId: episode.videoId?.toString(),
    vttId: episode.vttId?.toString(),
  }));

  res.json(episodes);
});

app.post("/auto_episode", async (req, res) => {
  const { seriesId, seasonId, nyaaQuery } = req.body;
  await db.season.update({
    data: {
      autoUpload: true,
      nyaaQuery: nyaaQuery,
    },
    where: { id: +seasonId },
  });
  await db.series.update({
    data: { updateAt: new Date() },
    where: { id: +seriesId },
  });
  res.json({ ok: true });
});

app.post("/auto_series", async (req, res) => {
  const { tmdbId } = req.body;
  await db.autoSeries.create({
    data: {
      tmdbId: +tmdbId,
    },
  });
  autoInseartSeries();
  res.json({ ok: true });
});

app.get("/video/:id", async (req, res) => {
  const id = req.params.id; //or use req.param('id')

  const filePath = path.join(__dirname, "../public", "video", id);

  // Listing 3.
  const options: VideoStremInfoOption = {};

  let start: any;
  let end: any;

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
        console.log(`Error reading file ${filePath}.`);
        console.log(error);
        res.sendStatus(500);
      });

      fileStream.pipe(res);
    }
  });
});

app.post(
  "/upload/subtitle",
  subtitleUpload.single("file"),
  async (req, res) => {
    if (req.file) {
      const newFileName = new Date().getTime() + "";
      const newPath = path.join(req.file?.destination, "/", newFileName);
      let vtt: undefined | string = undefined;
      if (req.file.originalname.includes(".ass")) {
        const ass = fs.readFileSync(req.file.path, "utf-8");
        vtt = subsrt.convert(ass, { format: "vtt" });
      } else if (req.file.originalname.includes(".smi")) {
        vtt = await smi2vtt(req.file.path);
      }
      if (vtt) {
        fs.writeFileSync(newPath, vtt);
        fs.rmSync(req.file.path);
        res.json({ ok: true, fileName: newFileName });
      } else {
        res.json({ ok: false, error: "this file is not subtile file.." });
      }
    }
  }
);

app.post("/subtitle", async (req, res) => {
  const { seriesId, episodeId, fileName, isAss } = req.body;
  const episode = await db.episode.update({
    data: {
      vttId: +fileName,
    },
    where: { id: +episodeId },
  });
  await db.series.update({
    data: { updateAt: new Date() },
    where: { id: +seriesId },
  });
  // ass 자막일 경우에만 처리하도록 처리.( video 에 ass 자막 합치기. )
  if (isAss) {
    const publicPath = path.join(__dirname, "../public");
    const videoPath = path.join(publicPath, "video", episode.videoId + "");
    const subTitlePath = path.join(publicPath, "subtitle", fileName);
    addSubtitleToVideo(videoPath, subTitlePath);
  }
  res.json({ ok: true });
});

app.get("/subtitle/:id", async (req, res) => {
  const id = req.params.id;
  const filePath = path.join(__dirname, "../public", "subtitle", id);
  res.setHeader("Content-Type", "text/vtt");
  res.sendFile(filePath);
});

app.listen(8000, () => {
  console.log("server is readey http://localhost:8000");
});
