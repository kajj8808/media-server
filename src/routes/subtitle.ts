import e, { Router } from "express";
import multer from "multer";
import fs from "fs";
import { SUBTITLE_FOLDER_DIR, VIDEO_FOLDER_DIR } from "../lib/constants";
import path from "path";
import { addAssSubtitleToVideo } from "../lib/ffmpeg";
import db from "../lib/db";

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
  fileFilter: fileFilter,
});

const checkAssFile = (filename: string) => filename.includes(".ass");

subtitleRouter.post(
  "/",
  subtitleUpload.single("subtitle"),
  async (req, res) => {
    const file = req.file;
    const episodeId = req.body.episode_id as number;
    if (file && episodeId) {
      const subtitleId = new Date().getTime();
      fs.renameSync(
        file.path,
        path.join(`${SUBTITLE_FOLDER_DIR}/${subtitleId}`)
      );
      await db.episode.update({
        where: {
          id: episodeId,
        },
        data: {
          subtitle_id: subtitleId.toString(),
          is_ass: checkAssFile(file.originalname),
        },
      });
      res.json({
        ok: true,
        subtitleId: subtitleId,
      });
      if (req.body.is_overlap) {
        try {
          await addAssSubtitleToVideo({
            assPath: `${SUBTITLE_FOLDER_DIR}/${subtitleId}`,
            videoOutPath: `${VIDEO_FOLDER_DIR}/${req.body.video_id}.mp4`,
            videoPath: `${VIDEO_FOLDER_DIR}/${req.body.video_id}`,
          });
          fs.rmSync(`${VIDEO_FOLDER_DIR}/${req.body.video_id}`);
          fs.renameSync(
            `${VIDEO_FOLDER_DIR}/${req.body.video_id}.mp4`,
            `${VIDEO_FOLDER_DIR}/${req.body.video_id}`
          );
          await db.episode.update({
            where: {
              id: episodeId,
            },
            data: {
              is_overlap: true,
            },
          });
        } catch (error) {
          console.error(error);
        }
      }
    } else {
      return res.json({
        ok: false,
      });
    }
  }
);

export default subtitleRouter;
