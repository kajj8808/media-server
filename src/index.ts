import "./data/tmdb";
import express from "express";

import { animationAutoDownload } from "./lib/auto";
import { createServer } from "./lib/http";
import { PORT } from "./lib/constants";
import { sleep } from "./lib/utils";

import seriesRouter from "./routes/series";
import videoRouter from "./routes/video";
import subtitleRouter from "./routes/subtitle";

const app = express();
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

while (true) {
  animationAutoDownload();
  // one day wait
  await sleep(1 * 60 * 60 * 24);
}
