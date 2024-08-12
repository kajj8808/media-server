import express from "express";
import multer from "multer";
import path from "path";

const checkAssFile = (file: Express.Multer.File) =>
  file.originalname.includes(".ass");

function subtitleFileFilter(
  req: express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  if (
    file.originalname.includes(".smi") ||
    file.originalname.includes(".ass")
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
}

const uploadRouter = express.Router();
const subtitleUpload = multer({
  dest: path.join(__dirname, "../../public", "subtitles"),
  fileFilter: subtitleFileFilter,
});
uploadRouter.post("/subtitle", subtitleUpload.single("file"), (req, res) => {
  if (req.file) {
    res.status(202).send("Processing...");
    const isAss = checkAssFile(req.file);

    if (isAss) {
      // ass logic ( 동영상 파일에 그냥 합쳐 버리는 로직 싱크는 프론트에서 맞쳐옴 )
    }
    // db upload logic
  } else {
    res.json({
      error: "file not exists.",
      ok: false,
    });
  }
});

export default uploadRouter;
