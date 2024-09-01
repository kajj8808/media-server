import e, { Router } from "express";
import multer from "multer";
import fs from "fs";
import { SUBTITLE_FOLDER_DIR, VIDEO_FOLDER_DIR } from "../lib/constants";
import path from "path";
import { addAssSubtitleToVideo } from "../lib/ffmpeg";
import db from "../lib/db";
import { convertAssToVtt } from "../lib/subtitle/assToVtt";
import { convertSmiToVtt } from "../lib/subtitle/smiToVtt";

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
const storage = multer.diskStorage({
  destination: (req, res, callback) => {
    callback(null, SUBTITLE_FOLDER_DIR);
  },
  filename: (req, file, callback) => {
    if (file.originalname.includes(".ass")) {
      callback(null, file.filename + ".ass");
    } else {
      callback(null, file.filename + ".smi");
    }
  },
});
const subtitleUpload = multer({
  storage: storage,
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
            is_ass: checkAssFile(file.originalname),
            is_smi: checkAssFile(file.originalname),
          },
        });
        res.json({
          ok: true,
          subtitleId: subtitleId,
        });
        if (req.body.is_overlap) {
          await addAssSubtitleToVideo({
            assPath: file.path,
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
        const fileData = fs.readFileSync(file.path, "utf-8");
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

export default subtitleRouter;
