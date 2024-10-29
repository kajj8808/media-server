import "./data/tmdb";
import express from "express";

import {
  animationAutoDownload,
  animationKorDescriptionAutoUpdate,
} from "./lib/auto";
import { createServer } from "./lib/http";
import { PORT } from "./lib/constants";
import { sleep } from "./lib/utils";

import seriesRouter from "./routes/series";
import videoRouter from "./routes/video";
import subtitleRouter from "./routes/subtitle";
import cors from "cors";
import { movieDownloadeHandler } from "./lib/torrent";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use("/series", seriesRouter);
app.use("/video", videoRouter);
app.use("/subtitle", subtitleRouter);

app.get("/", (req, res) => {
  return res.send("Hello Hono!");
});

app.post("/movie/insert", async (req, res) => {
  const magnet = req.body.magnet as string;
  const movieId = req.body.movie_id as number;
  const seriesId = req.body.series_id as number;

  if (isNaN(movieId) || isNaN(seriesId) || !magnet) {
    return res.json({
      ok: false,
    });
  }

  movieDownloadeHandler({ magnet, movieId, seriesId });
  return res.json({
    ok: true,
  });
});

const server = createServer(app);
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

while (true) {
  animationAutoDownload();
  animationKorDescriptionAutoUpdate();
  // 4 hour wait
  await sleep(1 * 60 * 60 * 4);
}
