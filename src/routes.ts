import express from "express";
import multer from "multer";
import mime from "mime";
import fs from "fs";

import { Season, Series } from "@prisma/client";
import { prismaClient } from "./util/client";
import { readAutoList } from "./util/server";
import { IUploadInfo } from "./interfaces";

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
  const { videoId } = req.params;
  const currentVideoPath = `${__dirname}/public/video/${videoId}`;
  try {
    const stat = await fs.statSync(currentVideoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const contentType = mime.lookup(currentVideoPath);

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");

      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(currentVideoPath, { start, end });
      const headers = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
      };
      res.writeHead(206, headers);
      file.pipe(res);
    } else {
      const headers = {
        "Content-Length": fileSize,
        "Content-Type": contentType + "",
      };

      res.writeHead(206, headers);
      fs.createReadStream(currentVideoPath).pipe(res);
    }
  } catch (error) {
    res.status(404);
  }
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
