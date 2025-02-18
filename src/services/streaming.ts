import ffmpeg from "fluent-ffmpeg";
import { exec } from "child_process";
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

// ffmpeg 옵션을 생성하는 함수 s16!!
function generateFfmpegOptions(videoCodec: AnalyzeVideoCodecResult) {
  const ffmpegOptions: string[] = [];

  // video
  if (videoCodec.video.reEncoding) {
    ffmpegOptions.push("-c:v hevc");
  } else {
    ffmpegOptions.push("-c:v copy");
  }

  // audio
  ffmpegOptions.push(
    "-c:a flac",
    "-b:a 256k",
    "-ar 48000",
    "-sample_fmt s16",
    "-ac 2",
    "-strict -2"
  );

  // 모두 적용되는 옵션 ( hvc1 , 일본어 선택. )
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
    await new Promise(async (resolve, reject) => {
      const commnad = `ffmpeg -i ${videoPath} ${ffmpegOptions.join(
        " "
      )} ${tempPath}`;
      await new Promise((resolve) => {
        exec(commnad, (err, stdout, stderr) => {
          resolve(true);
        });
      });
      resolve(true);
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

interface AddAssSubtitleToVideoProps {
  videoId: string;
  assPath: string;
}
export async function addAssSubtitleToVideo({
  videoId,
  assPath,
}: AddAssSubtitleToVideoProps) {
  const videoPath = path.join("public", "video", videoId);
  const tempPath = path.join("public", "temp", videoId);
  // 기본 코덱으로 hevc사용.
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .inputOptions([`-i ${assPath}`])
      .videoFilters([{ filter: "ass", options: assPath }])
      .output(tempPath)
      .outputOptions([
        "-c:v hevc",
        "-c:a copy",
        "-strict -2",
        "-tag:v hvc1",
        "-crf 23",
        "-threads 0",
      ])
      .on("end", async () => {
        fs.rmSync(videoPath);
        fs.renameSync(tempPath, videoPath);
        console.log("자막 추가 완료");
        resolve(null);
      })
      .on("progress", (progress) => {
        console.log(progress);
      })
      .on("error", (error) => {
        console.error(error);
        reject(error);
      })
      .on("stderr", (stderrLine) => {
        console.log("FFmpeg stderr:", stderrLine);
      })
      .run();
  });
}
/* 
TEST
const videoPath = path.join(DIR_NAME, "../../", "public", "temp", "13.mkv");
convertToStreamableVideo(videoPath);
 */
