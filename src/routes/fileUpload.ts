import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { convertToStreamableVideo } from "@services/streaming";

const fileUploadRouter = Router();

const fileUpload = multer({
  dest: path.join("public", "temp"),
});

fileUploadRouter.post(
  "/upload",
  fileUpload.single("blob"),
  async (req, res) => {
    const { fileName, fileIndex, chunks, mediaType } = req.body as {
      fileName?: string;
      fileIndex?: string;
      chunks?: string;
      mediaType?: string;
    };

    const file = req.file;

    if (!file || !fileIndex || !fileName || !chunks || !mediaType) {
      res.status(400).json({
        ok: false,
        error: "Bad Request",
      });
      return;
    }

    if (mediaType === "video" || mediaType === "image") {
      const tempDir = path.join("public", "temp", fileName);
      const tempPath = path.join(tempDir, fileIndex);

      if (!fs.existsSync(tempPath)) {
        try {
          fs.mkdirSync(tempDir);
        } catch (error) {}
      }

      fs.renameSync(file.path, tempPath);

      const files = fs.readdirSync(tempDir);
      if (files.length === +chunks) {
        // 0 , 1 , 10 <- 이렇게 나오는 문제가 있어서..
        const sortedFiles = files
          .map(Number)
          .sort((a, b) => a - b)
          .map(String);
        for (const file of sortedFiles) {
          const fileData = fs.readFileSync(path.join(tempDir, file));
          fs.appendFileSync(path.join("public", mediaType, fileName), fileData);
        }
        let newFileName = "";
        if (mediaType === "video") {
          newFileName = await convertToStreamableVideo(
            path.join("public", "video", fileName)
          );
        } else {
          newFileName = new Date().getTime().toString();
          const tempPath = path.join("public", "image", fileName);
          const newPath = path.join("public", "image", newFileName);
          fs.renameSync(tempPath, newPath);
        }
        fs.rmSync(path.join("public", "temp", fileName), {
          recursive: true,
        });
        res.json({ ok: true, fileName: newFileName });
      } else {
        res.json({ ok: true, len: files.length, chunks: chunks });
      }
    } else {
      res.status(400).json({
        ok: false,
        error: "Bad Request",
      });
    }
  }
);

export default fileUploadRouter;
