import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";

import { DIR_NAME } from "utils/constants";

interface AnalyzeVideoCodecResult {
  video: {
    reEncoding: boolean;
  };
  audio: {
    reEncoding: boolean;
  };
}

async function analyzeVideoCodec(
  videoPath: string,
  videoCodec?: string,
  audioCodec?: string
): Promise<AnalyzeVideoCodecResult> {
  const codec = {
    video: videoCodec ? videoCodec : "hevc",
    audio: audioCodec ? audioCodec : "aac",
  };
  console.log(codec);
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, data) => {
      if (err) {
        return reject(err);
      }

      const result: AnalyzeVideoCodecResult = {
        video: {
          reEncoding: true,
        },
        audio: {
          reEncoding: true,
        },
      };

      const streams = data.streams;

      const videoStream = streams.find(
        (stream) =>
          stream.codec_type === "video" && stream.codec_name === codec.video
      );

      const audioStream = streams.find(
        (stream) =>
          stream.codec_type === "audio" && stream.codec_name === codec.audio
      );

      if (videoStream) {
        result.video.reEncoding = false;
      }

      if (audioStream) {
        result.audio.reEncoding = false;
      }

      resolve(result);
    });
  });
}

// ffmpeg 옵션을 생성하는 함수
function generateFfmpegOptions(videoCodec: AnalyzeVideoCodecResult) {
  const ffmpegOptions: string[] = [];

  if (videoCodec.video.reEncoding) {
    ffmpegOptions.push("-c:v hevc");
  } else {
    ffmpegOptions.push("-c:v copy");
  }

  if (videoCodec.audio.reEncoding) {
    ffmpegOptions.push("-c:a flac", "-sample_fmt s16", "-ac 2", "-strict -2");
  } else {
    ffmpegOptions.push("-c:a copy");
  }

  ffmpegOptions.push("-map 0:v:0", "-map 0:a:m:language:jpn", "-tag:v hvc1");

  return ffmpegOptions;
}

export async function processVideo(videoPath: string, ffmpegOptions: string[]) {
  const videoId = new Date().getTime() + "";
  const tempPath = path.join(
    DIR_NAME,
    "../../",
    "public",
    "temp",
    `${videoId}.mkv`
  );
  const outputPath = path.join(
    DIR_NAME,
    "../../",
    "public",
    "video",
    `${videoId}`
  );

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions(ffmpegOptions)
        .output(tempPath)
        .on("progress", console.log)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    fs.renameSync(tempPath, outputPath);
  } catch (error) {
    console.error("Error in processVideo:", error);
  } finally {
    // 임시 파일 삭제
    if (fs.existsSync(tempPath)) {
      fs.rmSync(tempPath);
    }
    // 원본 비디오 파일 삭제
    if (fs.existsSync(videoPath)) {
      fs.rmSync(videoPath);
      console.log(`Original video file deleted: ${videoPath}`);
    }

    return videoId;
  }
}
interface Option {
  videoCodec: string;
  audioCodec: string;
}

export async function convertToStreamableVideo(
  videoPath: string,
  option?: Option
) {
  const videoCodec = await analyzeVideoCodec(
    videoPath,
    option?.videoCodec,
    option?.audioCodec
  );
  const ffmpegOptions = generateFfmpegOptions(videoCodec);
  const videoId = await processVideo(videoPath, ffmpegOptions);
  return videoId;
}

/* 
TEST
const videoPath = path.join(DIR_NAME, "../../", "public", "temp", "13.mkv");
convertToStreamableVideo(videoPath);
 */
