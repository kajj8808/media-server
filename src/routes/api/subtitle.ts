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
import { convertSrtToVtt } from "utils/subtitle/srtToVtt";
import { saveSubtitleFile, findSubtitleFile } from "@services/storage";

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

      const fileData = await readSubtitleFileData(file.path);
      let subtitleContent: string;
      
      if (file.originalname.includes(".ass")) {
        subtitleContent = convertAssToVtt(fileData);
      } else if (file.originalname.includes(".smi")) {
        subtitleContent = convertSmiToVtt(fileData);
      } else if (file.originalname.includes(".srt")) {
        subtitleContent = convertSrtToVtt(fileData);
      } else {
        subtitleContent = fileData;
      }

      const newFilePath = await saveSubtitleFile(newFileName, subtitleContent);

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

subtitleRouter.get("/:id", async (req, res) => {
  const filePath = await findSubtitleFile(req.params.id);
  
  if (filePath && fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "text/vtt");
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: "Subtitle file not found" });
  }
});

export default subtitleRouter;
