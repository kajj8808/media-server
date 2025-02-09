import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { DIR_NAME } from "utils/constants";
import { readSubtitleFileData } from "utils/lib";
import { convertAssToVtt } from "utils/subtitle/assToVtt";
import { convertSmiToVtt } from "utils/subtitle/smiToVtt";
import db from "@services/database";
import { addAssSubtitleToVideo } from "@services/streaming";

const subtitleRouter = Router();

const subtitleUpload = multer({
  dest: path.join(DIR_NAME, "../../", "public", "temp"),
});

subtitleRouter.post(
  "/upload",
  subtitleUpload.single("subtitle"),
  async (req, res) => {
    const file = req.file;
    const episodeId = req.body.episode_id as number;
    const isOverlap = req.body.is_overlap as string;

    if (file && episodeId) {
      const newFileName = new Date().getTime().toString();
      const newFilePath = path.join(
        DIR_NAME,
        "../../",
        "public",
        "subtitle",
        newFileName
      );
      const fileData = await readSubtitleFileData(file.path);
      if (file.originalname.includes(".ass")) {
        fs.writeFileSync(path.join(newFilePath), convertAssToVtt(fileData));
      } else {
        fs.writeFileSync(path.join(newFilePath), convertSmiToVtt(fileData));
      }
      fs.rmSync(file.path);

      const episode = await db.episode.update({
        where: {
          id: +episodeId,
        },
        data: {
          subtitle_id: newFileName,
        },
      });

      if (isOverlap === "on") {
        addAssSubtitleToVideo({
          videoId: episode.video_id,
          assPath: newFilePath,
        });
      }
    } else {
      res.json({ ok: false });
    }
  }
);

subtitleRouter.get("/:id", (req, res) => {
  const filePath = path.join(
    DIR_NAME,
    "../../",
    "public",
    "subtitle",
    req.params.id
  );
  res.setHeader("Content-Type", "text/vtt");
  res.sendFile(filePath);
});

export default subtitleRouter;
