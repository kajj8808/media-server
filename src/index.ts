import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes";
import { startSchduleJob } from "./scheduleJob";
import https from "https";
import { credentials } from "./https";

dotenv.config();

const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static(`${__dirname}/public`));

app.set("view engine", "pug");
app.set("views", `${__dirname}/public/views`);

app.use("/", router);

const httpsServer = https.createServer(credentials, app);

const handleListen = () => {
  console.log(`server listen http://localhost:${port}`);
  startSchduleJob();
};
const port = process.env.PORT || 443;

httpsServer.listen(port, handleListen);
