import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
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
/** codec이 h265(hvc1), aac로 이루어져 있는지 확인하는 함수입니다. */
export function hasValidCodecs(
  videoCodec: IVideoCodec,
  expectedVideoCodec: string,
  expectedAudioCodec: string
): boolean {
  if (
    videoCodec.video?.codec_name !== expectedVideoCodec ||
    videoCodec.audio?.codec_name !== expectedAudioCodec
  ) {
    return false;
  }
  return true;
}

export function hevcToHvc1(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    const filename = `${new Date().getTime()}`;
    const newPath = path.join(__dirname, "../../public", "video", filename);
    const tempPath = newPath + ".mp4";

    const command = `ffmpeg -i "${filePath}" -c copy -tag:v hvc1 "${tempPath}"`;
    const process = spawn(command, { shell: true, stdio: "pipe" });

    process.on("error", (error) => {
      console.error("Failed to start process:", error);
      reject(error);
    });

    process.on("exit", (code, signal) => {
      if (code === 0) {
        fs.renameSync(tempPath, newPath);
        fs.rmSync(filePath);
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
    let videoId = "";
    const videoCodecValid = hasValidCodecs(videoCodec, "hevc", "aac");
    if (videoCodecValid) {
      videoId = await hevcToHvc1(filePath);
    } else {
      videoId = await anyVideoToHvc1({
        filePath,
        audioIndex: videoCodec.audio?.index!,
        videoIndex: videoCodec.video?.index!,
        isHevc: videoCodec.video?.codec_name === "hevc",
      });
    }
    return videoId;
  } catch (error) {
    console.error("streming fomat error: ", error);
    return undefined;
  }
}
