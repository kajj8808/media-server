import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { DIR_NAME } from "utils/constants";
import { readSubtitleFileData } from "utils/lib";
import { convertAssToVtt } from "utils/subtitle/assToVtt";
import { convertSmiToVtt } from "utils/subtitle/smiToVtt";
import { addSubtitle } from "@services/database";
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
    const videoContentId = req.body.video_content_id as string;
    const isOverlap = req.body.is_overlap as string;
    if (file && videoContentId) {
      const newFileName = new Date().getTime().toString();
      const videoContet = await addSubtitle(videoContentId, newFileName);

      if (isOverlap === "on") {
        addAssSubtitleToVideo({
          videoId: videoContet.watch_id,
          assPath: file.path,
        });
        res.json({ ok: true });
        return;
      }

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

      if (isOverlap === "on") {
        addAssSubtitleToVideo({
          videoId: videoContet.watch_id,
          assPath: newFilePath,
        });
      }
      res.json({ ok: true });
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
