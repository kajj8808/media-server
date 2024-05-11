import "dotenv/config";

import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import db from "./lib/db";

import { autoInseartSeries } from "./tmdb";
import { VideoStremInfoOption } from "../types/interface";

const app = express();

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

app.listen(8000, () => {
  console.log("server is readey http://localhost:8000");
});
