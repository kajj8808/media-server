import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs, { renameSync } from "fs";
import { changePath } from "./utile";
interface IVideoCodec {
  video?: ffmpeg.FfprobeStream;
  audio?: ffmpeg.FfprobeStream;
}
export async function getVideoCodec(
  filePath: string
): Promise<IVideoCodec | undefined> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (error, data) => {
      if (error) {
        reject(error);
        return;
      }
      const codec: IVideoCodec = {};
      let videoCount = 0;
      for (let stream of data.streams) {
        if (stream.codec_type === "video") {
          videoCount++;
          if (codec["video"]?.codec_name === "hevc") continue;
          codec["video"] = stream;
        }
        if (stream.codec_type === "audio") {
          if (codec["audio"]?.tags.language === "jpn") continue;
          codec["audio"] = stream;
          // video stream 갯수만큼 빼서 오디오 인덱스 번호 추출
          codec["audio"].index -= videoCount;
        }
      }
      if (!codec.video || !codec.audio) {
        resolve(undefined);
      } else {
        resolve(codec);
      }
    });
  });
}

export function runCommand(option: string, filePath: string) {
  return new Promise<string>((resolve, reject) => {
    const filename = `${new Date().getTime()}`;
    const newPath = path.join(__dirname, "../../public", "video", filename);
    const tempPath = newPath + ".mp4";

    const command = `ffmpeg -i "${filePath}" ${option} "${tempPath}"`;

    const process = spawn(command, { shell: true, stdio: "pipe" });

    process.on("error", (error) => {
      console.error("Failed to start process:", error);
      reject(error);
    });

    process.on("exit", (code, signal) => {
      if (code === 0) {
        renameSync(filePath, newPath);
        resolve(filename);
      } else {
        reject(code);
      }
    });
  });
}

interface anyVideoToHvc1Props {
  filePath: string;
  videoIndex: number;
  audioIndex: number;
  isHevc: boolean;
}
export function anyVideoToHvc1(props: anyVideoToHvc1Props) {
  return new Promise<string>((resolve, reject) => {
    const filename = `${new Date().getTime()}`;
    const newPath = path.join(__dirname, "../../public", "video", filename);
    const tempPath = newPath + ".mkv";
    const command = `${ffmpegPath} -i "${props.filePath}" -map 0:v:${
      props.videoIndex
    } -map 0:a:${props.audioIndex} -c:v ${
      props.isHevc ? "copy" : "hevc"
    } -tag:v hvc1 -c:a aac -ac 2 -b:a 640k  "${tempPath}"`;
    const process = spawn(command, { shell: true, stdio: "pipe" });

    process.on("error", (error) => {
      console.error("Failed to start process:", error);
      reject(error);
    });

    process.on("exit", (code, signal) => {
      if (code === 0) {
        fs.renameSync(tempPath, newPath);
        fs.rmSync(props.filePath);
        resolve(filename);
      } else {
        reject(code);
      }
    });
  });
}

/** streming이 가능한 fomat으로 변경하는 함수 입니다. */
export async function streamingFormatConverter(filePath: string) {
  try {
    const videoCodec = await getVideoCodec(filePath);
    if (!videoCodec) return;
    let option = ``;

    if (
      videoCodec.audio?.codec_name === "aac" &&
      videoCodec.video?.codec_name === "hevc"
    ) {
      option = "-c copy -tag:v hvc1";
    } else if (
      videoCodec.audio?.codec_name === "flac" &&
      videoCodec.video?.codec_name === "hevc"
    ) {
      option = "-tag:v hvc1 -c:v copy -c:a flac -ac 2 -strict -2";
    } else {
      option = "-tag:v hvc1 -c:v hevc -c:a flac -ac 2 -strict -2";
    }
    const videoId = await runCommand(option, filePath);
    return videoId;
  } catch (error) {
    console.error("streming fomat error: ", error);
    return undefined;
  }
}

export async function addSubtitleToVideo(
  videoPath: string,
  subTitlePath: string
) {
  return new Promise<string>((resolve, reject) => {
    const tempPath = videoPath + ".mp4";

    const command = `ffmpeg -i "${videoPath}" -vf "ass=${subTitlePath}" -c:a copy -c:v hevc -crf 18 -tag:v hvc1 "${tempPath}"`;
    const process = spawn(command, { shell: true, stdio: "pipe" });

    process.on("error", (error) => {
      console.error("Failed to start process:", error);
      reject(error);
    });
    process.stdout.on("data", (data) => {
      console.log(data.toString());
    });

    process.stderr.on("data", (data) => {
      console.error(data.toString());
    });

    process.on("exit", (code, signal) => {
      if (code === 0) {
        fs.renameSync(tempPath, videoPath);
        resolve("");
      } else {
        reject(code);
      }
    });
  });
}
