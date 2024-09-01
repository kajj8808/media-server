import ffmpeg from "fluent-ffmpeg";
import path from "path";
import { DIR_NAME, VIDEO_FOLDER_DIR } from "./constants";
import { renameSync } from "fs";

function checkCurrentLanguage(currentLanguage: String, language: String) {
  return language === currentLanguage;
}
interface GetCurrentStremingCodecIndexProps {
  videoPath: string;
  videoCodec?: string;
  audioCodec?: String;
  language?: String;
}
interface GetCurrentStremingCodecIndexResult {
  videoCodec: {
    index: number | undefined;
  };
  audioCodec: {
    index: number | undefined;
  };
  err?: any;
}
export function getCurrentStremingCodecIndex({
  audioCodec = "aac",
  videoCodec = "hevc",
  videoPath,
  language = "jpn",
}: GetCurrentStremingCodecIndexProps): Promise<GetCurrentStremingCodecIndexResult> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        return reject(err);
      }
      const vidoStreams = metadata.streams.filter(
        (stream) => stream.codec_type === "video"
      );
      const audioStreams = metadata.streams.filter(
        (stream) => stream.codec_type === "audio"
      );

      const currentVideoCodec = vidoStreams.find(
        (stream) => stream.codec_name === videoCodec
      );

      const currentAudioCodec = audioStreams.find((stream) => {
        let currentCodec = false;

        if (stream.codec_name === audioCodec) {
          currentCodec = true;
        } else {
          currentCodec = false;
          return currentCodec;
        }

        if (stream.tags.language) {
          currentCodec = checkCurrentLanguage(language, stream.tags.language);
        }
        return currentCodec;
      });

      return resolve({
        videoCodec: {
          index: currentVideoCodec?.index,
        },
        audioCodec: {
          index: currentAudioCodec?.index,
        },
      });
    });
  });
}

function escapeFilePath(filePath: string) {
  return `"${filePath.replace(/\\/g, "\\\\")}"`;
}
interface AddAssSubtitleToVideoProps {
  videoPath: string;
  assPath: string;
  videoOutPath: string;
  videoCodec?: string;
}
export async function addAssSubtitleToVideo({
  videoPath,
  assPath,
  videoOutPath,
  videoCodec,
}: AddAssSubtitleToVideoProps) {
  // 기본 코덱으로 hevc사용.
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .inputOptions([`-i ${escapeFilePath(assPath)}`])
      .videoFilters([{ filter: "ass", options: escapeFilePath(assPath) }])
      .output(videoOutPath)
      .outputOptions([
        videoCodec ? `-c:v ${videoCodec}` : "-c:v hevc",
        "-c:a copy",
        videoCodec ? "" : "-tag:v hvc1",
        "-crf 23",
        "-threads 0",
      ])
      .on("end", () => {
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
      .run();
  });
}

export async function streamingFormatConverter(videoPath: string) {
  const { videoCodec, audioCodec, err } = await getCurrentStremingCodecIndex({
    videoPath: videoPath,
  });
  if (err) {
    console.error(`not found video ${videoPath}`);
    return undefined;
  }

  let videoId;

  if (videoCodec.index !== undefined && audioCodec.index !== undefined) {
    videoId = await runFfmpeg(videoPath, ["-c copy", "-tag:v hvc1"]);
  } else if (videoCodec.index !== undefined && audioCodec.index === undefined) {
    videoId = await runFfmpeg(videoPath, [
      "-c:v copy",
      "-c:a flac",
      "-sample_fmt s16",
      "-ac 2",
      "-strict -2",
      "-map 0:v:0",
      "-map 0:a:m:language:jpn",
      "-tag:v hvc1",
    ]);
  } else if (videoCodec.index === undefined && audioCodec.index !== undefined) {
    videoId = await runFfmpeg(videoPath, [
      "-c:v hevc",
      "-c:a copy",
      "-map 0:v:0",
      "-map 0:a:m:language:jpn",
      "-tag:v hvc1",
    ]);
  } else {
    videoId = await runFfmpeg(videoPath, [
      "-c:v hevc",
      "-c:a flac",
      "-sample_fmt s16",
      "-ac 2",
      "-strict -2",
      "-map 0:v:0",
      "-map 0:a:m:language:jpn",
      "-tag:v hvc1",
    ]);
  }
  return videoId;
}

async function runFfmpeg(
  videoPath: string,
  outputOptions: string[]
): Promise<string> {
  const videoId = new Date().getTime() + "";
  const newVideoPath = path.join(VIDEO_FOLDER_DIR, videoId + ".mp4");
  return new Promise((resolve) =>
    ffmpeg(videoPath)
      .outputOptions(outputOptions)
      .output(newVideoPath)
      .on("end", () => {
        renameSync(newVideoPath, path.join(VIDEO_FOLDER_DIR, videoId));
        resolve(videoId);
      })
      .on("progress", (progress) => {
        console.log(progress);
      })
      .on("error", (error) => {
        console.error(error);
      })
      .run()
  );
}

/* const tempVideoPath = path.join(DIR_NAME, "../../public", "video", "t.mkv");
streamingFormatConverter(tempVideoPath);
 */
