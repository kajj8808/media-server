import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes";
import { startSchduleJob } from "./util/scheduleJob";
import https from "https";
import { credentials } from "./util/https";
import cluster from "cluster";
import os from "os";

dotenv.config();
const numCPUs = os.cpus().length;

const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static(`${__dirname}/public`));

app.set("view engine", "pug");
app.set("views", `${__dirname}/public/views`);

app.use("/", router);

if (cluster.isPrimary) {
  // 마스터 프로세스

  // 작업자 프로세스 생성
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`작업자 ${worker.process.pid} 종료됨`);
    cluster.fork();
  });
} else {
  const httpsServer = https.createServer(credentials, app);

  const handleListen = () => {
    console.log(`server listen http://localhost:${port}`);
    startSchduleJob();
  };
  const port = process.env.PORT || 443;

  httpsServer.listen(port, handleListen);
}
