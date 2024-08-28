import fs from "fs";
import path from "path";
import { DIR_NAME } from "./constants";
import https from "https";
import http from "http";
import { Express } from "express";

export function createServer(app: Express) {
  let server;
  try {
    const httpsOptions = {
      key: fs.readFileSync(path.join(DIR_NAME, "../../keys/private.key")),
      cert: fs.readFileSync(path.join(DIR_NAME, "../../keys/certificate.crt")),
    };
    server = https.createServer(httpsOptions, app);
  } catch (error) {
    server = http.createServer(app);
  }
  return server;
}
