import http from "http";
import express from "express";
import multer from "multer";
import path from "path";
import cors from "cors";
import uploadRouter from "./routes/upload";
import dotenv from "dotenv";

dotenv.config();
function createServer() {
  return;
}

const app = express();

app.use(cors());

app.get("/", (_, res) => res.json({ ok: true }));
app.use("/upload", uploadRouter);

app.listen(4040, () => console.log("server is ready http://localhost:4000"));

/// 필요한 기능 api
// smi or ass upload
// tmdb 시리즈 등록 ( tmdb id로 동작 )
// season nyaa 등록 ( nyaa url 등록 )
// discord message 보내기
// video streming
// smi streming

// 비디오 파일 인코딩,
// 비디오 파일을 웹페이지에 스트리밍 가능하게 인코딩.
// 비디오 파일에 ass파일 입히기

// test paths
const videoPath = path.join(__dirname, "../public", "video", "sample");
const videoOutPath = path.join(__dirname, "../public", "video", "sample1.mp4");
const subtitlePath = path.join(__dirname, "../public", "subtitle", "sample");

import "./utils/ffmpeg";
import "./data/tmdb";
