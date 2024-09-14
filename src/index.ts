import "./data/tmdb";
import express from "express";

import { animationAutoDownload } from "./lib/auto";
import { createServer } from "./lib/http";
import { PORT, SUBTITLE_FOLDER_DIR, VIDEO_FOLDER_DIR } from "./lib/constants";
import { readSubtitleFileData, sleep } from "./lib/utils";

import seriesRouter from "./routes/series";
import videoRouter from "./routes/video";
import subtitleRouter from "./routes/subtitle";
import path from "path";
import bodyParser from "body-parser";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/series", seriesRouter);
app.use("/video", videoRouter);
app.use("/subtitle", subtitleRouter);

app.get("/", (req, res) => {
  return res.send("Hello Hono!");
});

const server = createServer(app);
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// TEST
/* const videoPath = path.join(VIDEO_FOLDER_DIR, "T.mkv");
const videoOutPath = path.join(VIDEO_FOLDER_DIR, "T.mp4");
const assPath = path.join(SUBTITLE_FOLDER_DIR, "T.ass");

addAssSubtitleToVideo({ videoPath, assPath, videoOutPath }); */

/* import fs from "fs";

import { convertAssToVtt } from "./lib/subtitle/assToVtt";
import { convertSmiToVtt } from "./lib/subtitle/smiToVtt";
(async () => {
  const assPath = path.join(SUBTITLE_FOLDER_DIR, "T.ass");
  const smiPath = path.join(SUBTITLE_FOLDER_DIR, "w.smi");

  const filedata = await readSubtitleFileData(assPath);
  //const filedata = await readSubtitleFileData(smiPath);
  console.log(filedata);
  console.log(convertSmiToVtt(filedata));
})();
 */

while (true) {
  animationAutoDownload();
  // one day wait
  await sleep(1 * 60 * 60 * 24);
}
