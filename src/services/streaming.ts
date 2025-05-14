import ffmpeg from "fluent-ffmpeg";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

import { DIR_NAME } from "utils/constants";

interface AnalyzeVideoCodecResult {
  video: {
    reEncoding: boolean;
    streamIndex: number;
  };
  audio: {
    reEncoding: boolean;
    language: string;
    streamIndex: number;
  };
}

export async function analyzeVideoCodec(
  videoPath: string
): Promise<AnalyzeVideoCodecResult> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, data) => {
      if (err) {
        return reject(err);
      }

      const result: AnalyzeVideoCodecResult = {
        video: {
          reEncoding: true,
          streamIndex: -1,
        },
        audio: {
          reEncoding: true,
          streamIndex: -1,
          language: "default",
        },
      };

      const streams = data.streams;

      // ✅ HEVC (H.265) 비디오 스트림 찾기
      const currentVideoStream = streams.find(
        (stream) =>
          stream.codec_type === "video" && stream.codec_name === "hevc"
      );

      if (currentVideoStream) {
        result.video.reEncoding = false;
        result.video.streamIndex = currentVideoStream.index; // 🔹 비디오 스트림 index 저장
      }

      // ✅ FLAC (2채널) 오디오 스트림 찾기
      const currentAudioStream = streams.find(
        (stream) =>
          stream.codec_type === "audio" && // ✅ FLAC 또는 AAC 허용 - > AAC의 경우 이 프로그램에서 사용하는 옵션을 사용할 경우 용량만 올라가는 문제가 있어서 여기서 수정.
          ((stream.codec_name === "flac" &&
            stream.channels === 2 &&
            stream.sample_fmt === "s24") ||
            stream.sample_fmt === "s16" ||
            (stream.codec_name === "aac" && stream.channels === 2))
      );

      if (currentAudioStream) {
        const videos = streams.filter(
          (stream) => stream.codec_type === "video"
        );

        result.audio.reEncoding = false;
        result.audio.streamIndex = currentAudioStream.index - videos.length; // 🔹 오디오 스트림 index 저장
        console.log(streams);
      }

      // ✅ 오디오 언어 설정 (FLAC 스트림 기준)
      if (currentAudioStream && currentAudioStream.tags?.language) {
        result.audio.language = currentAudioStream.tags.language;
      }

      resolve(result);
    });
  });
}

// ffmpeg 옵션을 생성하는 함수 s16!!
export function generateFfmpegOptions(
  videoCodec: AnalyzeVideoCodecResult
): string[] {
  const ffmpegOptions: string[] = [];

  // 비디오 옵션 처리
  if (videoCodec.video.reEncoding) {
    ffmpegOptions.push(
      "-c:v",
      "hevc",
      "-preset",
      "slow",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p10le",
      "-b:v",
      "3775k",
      "-color_primaries",
      "bt709",
      "-color_trc",
      "bt709",
      "-colorspace",
      "bt709"
    );
  } else {
    ffmpegOptions.push("-c:v", "copy");
  }

  // 오디오 옵션 처리 (FLAC, 2채널, 256k, 48kHz)
  // 만약 reEncoding이 필요한 경우에만 옵션을 적용하고,
  // 이미 오디오가 2채널이면 copy 옵션을 쓸 수도 있음.
  if (videoCodec.audio.reEncoding) {
    ffmpegOptions.push(
      "-c:a",
      "flac",
      "-b:a",
      "256k",
      "-ar",
      "48000",
      "-ac",
      "2",
      "-strict",
      "-2"
    );
  } else {
    ffmpegOptions.push("-c:a", "copy");
  }

  if (
    typeof videoCodec.audio.streamIndex === "number" &&
    videoCodec.audio.streamIndex >= 0
  ) {
    ffmpegOptions.push("-map", `0:a:${videoCodec.audio.streamIndex}`);
  } else if (videoCodec.audio.language === "jpn") {
    ffmpegOptions.push("-map", "0:a:m:language:jpn");
  } else {
    ffmpegOptions.push("-map", "0:a:0");
  }

  if (
    typeof videoCodec.video.streamIndex === "number" &&
    videoCodec.video.streamIndex >= 0
  ) {
    ffmpegOptions.push("-map", `0:v:${videoCodec.video.streamIndex}`);
  } else {
    ffmpegOptions.push("-map", "0:v:0");
  }

  // 비디오 태그 설정 ( hvc1 )
  ffmpegOptions.push("-tag:v", "hvc1", "-strict -2");

  return ffmpegOptions;
}

export async function processVideo(
  videoPath: string,
  ffmpegOptions: string[],
  fileName?: string
) {
  const videoId = fileName ? fileName : new Date().getTime() + "";
  const tempPath = path.join(
    DIR_NAME,
    "../../",
    "public",
    "temp",
    `${videoId}.mp4`
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
      const command = "ffmpeg";
      const args = [
        "-i",
        `"${videoPath}"`,
        ...ffmpegOptions,
        `"public/temp/${videoId}.mp4"`,
      ];

      console.log("FFmpeg 실행:", command, args.join(" "));

      const process = spawn(command, args, { shell: true });

      process.stdout.on("data", (data) => {
        console.log(`FFmpeg 출력: ${data}`);
      });

      process.stderr.on("data", (data) => {
        console.log(`FFmpeg 출력: ${data}`);
      });

      process.on("close", (code) => {
        if (code === 0) {
          console.log("FFmpeg 변환 완료");
          resolve(true);
        } else {
          reject(new Error(`FFmpeg 실패 (코드: ${code})`));
        }
      });

      process.on("error", (err) => {
        console.error("FFmpeg 실행 중 오류 발생:", err);
        reject(err);
      });

      console.log("끝 (프로세스 시작됨)");
    });
  } catch (error) {
    console.error("Error in processVideo:", error);
  } finally {
    // 원본 비디오 파일 삭제
    if (fs.existsSync(videoPath)) {
      fs.rmSync(videoPath);
      console.log(`Original video file deleted: ${videoPath}`);
    }

    fs.renameSync(tempPath, outputPath);

    // 임시 파일 삭제
    if (fs.existsSync(tempPath)) {
      fs.rmSync(tempPath);
    }
    return videoId;
  }
}
interface Option {
  videoCodec: string;
  audioCodec: string;
  fileName?: string;
}

export async function convertToStreamableVideo(
  videoPath: string,
  option?: Option
) {
  console.log(videoPath, option);
  const videoCodec = await analyzeVideoCodec(videoPath);
  const ffmpegOptions = generateFfmpegOptions(videoCodec);
  const videoId = await processVideo(
    videoPath,
    ffmpegOptions,
    option?.fileName
  );
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
  const tempPath = path.join("public", "temp", `${videoId}.mp4`);
  // 임시 디렉토리 존재 확인 및 생성
  const tempDir = path.join("public", "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const ffmpegOption = [
    "-vf",
    `"ass=${assPath}"`,
    "-c:v",
    "hevc",
    "-crf",
    "23",
    "-preset",
    "fast",
    "-tag:v",
    "hvc1",
    "-c:a",
    "copy",
    "-strict",
    "-2",
    "-threads",
    "0",
  ];
  return await processVideo(videoPath, ffmpegOption, videoId);
}

/* 
TEST
const videoPath = path.join(DIR_NAME, "../../", "public", "temp", "13.mkv");
convertToStreamableVideo(videoPath);
 */
