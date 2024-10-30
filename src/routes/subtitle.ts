import e, { Router } from "express";
import multer from "multer";
import fs from "fs";
import { SUBTITLE_FOLDER_DIR, VIDEO_FOLDER_DIR } from "../lib/constants";
import path from "path";
import { addAssSubtitleToVideo } from "../lib/ffmpeg";
import db from "../lib/db";
import { convertAssToVtt } from "../lib/subtitle/assToVtt";
import { convertSmiToVtt } from "../lib/subtitle/smiToVtt";
import { readSubtitleFileData } from "../lib/utils";

const fileFilter = (
  req: e.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const typeArray = file.mimetype.split("/");
  const fileType = typeArray[1];

  if (fileType == "smi" || fileType == "ass") {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const subtitleRouter = Router();

const subtitleUpload = multer({
  dest: `${SUBTITLE_FOLDER_DIR}`,
});

const checkAssFile = (filename: string) => filename.includes(".ass");

subtitleRouter.post(
  "/",
  subtitleUpload.single("subtitle"),
  async (req, res) => {
    const file = req.file;
    const episodeId = req.body.episode_id as number;
    if (file && episodeId) {
      try {
        const subtitleId = new Date().getTime();

        await db.episode.update({
          where: {
            id: +episodeId,
          },
          data: {
            subtitle_id: subtitleId.toString(),
          },
        });
        res.json({
          ok: true,
          subtitleId: subtitleId,
        });
        if (req.body.is_overlap) {
          fs.renameSync(
            file.path,
            path.join(SUBTITLE_FOLDER_DIR, file.filename + ".ass")
          );
          console.log(path.join(SUBTITLE_FOLDER_DIR, file.filename + ".ass"));
          await addAssSubtitleToVideo({
            assPath: path.join(SUBTITLE_FOLDER_DIR, file.filename + ".ass"),
            videoOutPath: path.join(
              VIDEO_FOLDER_DIR,
              req.body.video_id + ".mp4"
            ),
            videoPath: path.join(VIDEO_FOLDER_DIR, req.body.video_id),
          });
          fs.rmSync(`${VIDEO_FOLDER_DIR}/${req.body.video_id}`);
          fs.renameSync(
            path.join(VIDEO_FOLDER_DIR, req.body.video_id + ".mp4"),
            path.join(VIDEO_FOLDER_DIR, req.body.video_id)
          );
          await db.episode.update({
            where: {
              id: +episodeId,
            },
            data: {
              is_overlap: true,
            },
          });
        }
        const fileData = await readSubtitleFileData(file.path);
        if (file.originalname.includes(".ass")) {
          fs.writeFileSync(
            path.join(SUBTITLE_FOLDER_DIR, subtitleId.toString()),
            convertAssToVtt(fileData)
          );
        } else {
          fs.writeFileSync(
            path.join(SUBTITLE_FOLDER_DIR, subtitleId.toString()),
            convertSmiToVtt(fileData)
          );
        }

        fs.rmSync(file.path);
      } catch (error) {
        console.error(error);
      }
    } else {
      return res.json({
        ok: false,
      });
    }
  }
);

subtitleRouter.get("/:id", (req, res) => {
  const filePath = path.join(SUBTITLE_FOLDER_DIR, req.params.id);
  res.setHeader("Content-Type", "text/vtt");
  res.sendFile(filePath);
});

export default subtitleRouter;
