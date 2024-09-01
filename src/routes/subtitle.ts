import { Router } from "express";
import multer from "multer";
import { SUBTITLE_FOLDER_DIR } from "../lib/constants";

const subtitleRouter = Router();
const subtitleUpload = multer({ dest: `${SUBTITLE_FOLDER_DIR}` });

subtitleRouter.post(":id", subtitleUpload.single("subtitle"), (req, res) => {});

export default subtitleRouter;
