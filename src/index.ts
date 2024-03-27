/* import express from "express";
import cors from "cors";
import mime from "mime-types";
import multer from "multer";
import fs from "fs";

const PORT = 8080;

const upload = multer({ dest: "./src/chunks/" });

const app = express();
app.use(express.json());
app.use(cors());

app.get("/", (_, res) => res.send("root home"));

app.get("/video/:videoId", async (req, res) => {
  const { videoId } = req.params;
  const currentVideoPath = `${__dirname}/public/video/${videoId}`;
  try {
    const stat = await fs.statSync(currentVideoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const contentType = mime.lookup(currentVideoPath);

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");

      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(currentVideoPath, { start, end });
      const headers = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
      };
      res.writeHead(206, headers);
      file.pipe(res);
    } else {
      const headers = {
        "Content-Length": fileSize,
        "Content-Type": contentType + "",
      };

      res.writeHead(206, headers);
      fs.createReadStream(currentVideoPath).pipe(res);
    }
  } catch (error) {
    res.status(404);
  }
});

app.post("/upload/video", upload.single("chuck"), async (req, res) => {
  const chunk = req.file;
  const uploadId = req.body.uploadId;
  if (!chunk) return;

  fs.appendFileSync(
    `${__dirname}/public/video/${uploadId}`,
    fs.readFileSync(chunk?.path)
  );

  fs.unlinkSync(chunk.path);

  res.status(200).send("ok");
});

app.post("/upload/smi", upload.single("chuck"), async (req, res) => {
  const chunk = req.file;
  const uploadId = req.body.uploadId;

  if (!chunk) return;

  fs.appendFileSync(
    `${__dirname}/public/smi/${uploadId}`,
    fs.readFileSync(chunk?.path)
  );

  fs.unlinkSync(chunk.path);

  res.status(200).send("ok");
});

app.listen(PORT, () => {
  console.log(`server listen http://localhost:${PORT}`);
});

import "./torrent";
 */

import { checkMagnetExists, downloadTorrentVideo, saveMagnet } from "./torrent";
import { getNyaaMagnets } from "./nyaa";

/* (async () => {
   const magnets = await getNyaaMagnets(
    "https://nyaa.si/?f=0&c=0_0&q=%5BEMBER%5D+Sousou+no+Frieren+S01"
  ); 

  //magnets.slice(0, 1).forEach((magnet) => {
    // if (checkMagnetExists(magnet)) return;
    // console.log(magnet);
    // downloadTorrentVideo(magnet);
    saveMagnet(magnet); 
  //});

magnets.forEach((magnet) => {
    downloadTorrentVideo(magnet);
  }); 
})(); */

interface IUploadInfo {
  nyaaQuery: string;
  season: number;
  series: number;
}

const autoUploadList: IUploadInfo[] = [
  {
    nyaaQuery: "",
    season: 1,
    series: 1,
  },
];
