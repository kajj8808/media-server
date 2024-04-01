import express from "express";
import multer from "multer";
import mime from "mime";
import fs from "fs";

import { Season, Series } from "@prisma/client";
import { prismaClient } from "./util/client";
import { readAutoList } from "./util/server";
import { IUploadInfo } from "./interfaces";
import path from "path";
import rangeParser, { Ranges, Result } from "range-parser";

const router = express.Router();
const upload = multer({ dest: "./src/chunks/" });
router.get("/", (req, res) => {
  res.render("home");
});

router.get("/create-series", (_, res) => res.render("series"));
router.post("/create-series", async (req, res) => {
  const series = req.body as Series;
  await prismaClient.series.create({
    data: series,
  });
  res.send(true);
});

router.get("/create-season", (_, res) => res.render("season"));
router.post("/create-season", async (req, res) => {
  const season = req.body as Season;
  await prismaClient.season.create({
    data: {
      name: season.name,
      seriesId: +season.seriesId,
      number: +season.number,
    },
  });
  res.send(true);
});

router.get("/auto-episode", (_, res) => res.render("auto"));
router.post("/auto-episode", async (req, res) => {
  const autoInfo = req.body as IUploadInfo;
  const arrayData = readAutoList();

  let exits = false;
  arrayData.forEach((item) => {
    if (
      item.tmdbId === autoInfo.tmdbId ||
      item.nyaaQuery === autoInfo.nyaaQuery
    ) {
      exits = true;
    }
  });

  const seasonNumber = await prismaClient.season.findUnique({
    where: {
      id: autoInfo.seasonId,
    },
    select: {
      number: true,
    },
  });

  if (exits) return;
  fs.writeFileSync(
    `${__dirname}/public/json/auto_list.json`,
    JSON.stringify([...arrayData, { ...autoInfo, seasonNumber }])
  );
  res.send(true);
});

router.get("/get-series", async (_, res) => {
  const series = await prismaClient.series.findMany();
  res.send(series);
});

router.post("/get-season", async (req, res) => {
  const seriesId = req.body.seriesId;
  const season = await prismaClient.season.findMany({
    where: {
      seriesId: +seriesId,
    },
  });
  res.send(season);
});

router.get("/video/:videoId", async (req, res) => {
  const videoId = req.params.videoId;
  const videoPath = path.join(__dirname, "src", "video", videoId);

  fs.access(videoPath, fs.constants.F_OK, (error) => {
    if (error) {
      res.status(404).send("video not found");
      return;
    }

    const range = req.headers.range;
    if (!range) {
      res.status(400).send("range header required");
      return;
    }

    const videoSize = fs.statSync(videoPath).size;
    const chuckSize = 10 ** 6;

    const rangeResult = rangeParser(videoSize, range);

    if (!Array.isArray(rangeResult)) return;
    const start = rangeResult[0].start;
    const end = Math.min(start + chuckSize, videoSize - 1);
    const contentLength = end - start + 1;

    if (req.method === "HEAD") {
      res.status(200).header({
        "accept-ranges": "bytes",
        "content-length": contentLength,
      });
      res.end();
    }

    res.status(206).header({
      "Content-Range": `bytes ${start}-${end}/${videoSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": contentLength,
      "Content-Type": "video/mp4",
    });

    const stream = fs.createReadStream(videoPath, { start, end });

    stream.on("error", (error) => {
      res.status(500).send("error streaming video");
      console.error(`stream error: ${error}`);
    });

    stream.pipe(res);
  });
});

router.get("/vtt/:smiId", async (req, res) => {});

router.post("/upload/video", upload.single("chuck"), async (req, res) => {
  const chunk = req.file;
  const uploadId = req.body.uploadId;
  if (!chunk) return;
  fs.appendFileSync(
    `${__dirname}/public/video/${uploadId}`,
    fs.readFileSync(chunk?.path)
  );
  fs.unlinkSync(chunk.path);
  res.status(200).send("ok");
});

router.post("/upload/smi", upload.single("chuck"), async (req, res) => {
  const chunk = req.file;
  const uploadId = req.body.uploadId;
  if (!chunk) return;
  fs.appendFileSync(
    `${__dirname}/public/smi/${uploadId}`,
    fs.readFileSync(chunk?.path)
  );
  fs.unlinkSync(chunk.path);
  res.status(200).send("ok");
});

export default router;
