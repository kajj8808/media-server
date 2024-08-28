import "./data/tmdb";
import seriesRouter from "./routes/series";
import videoRouter from "./routes/video";
import { animationAutoDownload } from "./lib/auto";
import express from "express";
import { createServer } from "./lib/http";
import { PORT } from "./lib/constants";

const app = express();
app.use("/series", seriesRouter);
app.use("/video", videoRouter);

app.get("/", (req, res) => {
  return res.send("Hello Hono!");
});

const server = createServer(app);
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

animationAutoDownload();
