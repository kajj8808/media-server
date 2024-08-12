import ffmpeg from "fluent-ffmpeg";
import path from "path";

function checkCurrentLanguage(currentLanguage: String, language: String) {
  return language === currentLanguage;
}
interface GetCurrentStremingCodecIndexProps {
  videoPath: string;
  videoCodec?: string;
  audioCodec?: String;
  language?: String;
}
export function getCurrentStremingCodecIndex({
  audioCodec,
  videoCodec = "hevc",
  videoPath = "aac",
  language = "jpn",
}: GetCurrentStremingCodecIndexProps) {
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

      return {
        videoCodec: {
          index: currentVideoCodec?.index,
        },
        audioCodec: {
          index: currentAudioCodec?.index,
        },
      };
    });
  });
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
      .inputOptions([`-i ${assPath}`])
      .videoFilters([{ filter: "ass", options: assPath }])
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

// test paths
/* const videoPath = path.join(__dirname, "../../public", "video", "sample");
const videoOutPath = path.join(
  __dirname,
  "../../public",
  "video",
  "sample1.mp4"
);
const subtitlePath = path.join(__dirname, "../../public", "subtitle", "sample");

getCurrentStremingCodecIndex({
  audioCodec: "aac",
  videoCodec: "hevc",
  videoPath,
});
 */
