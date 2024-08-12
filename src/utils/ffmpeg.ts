import ffmpeg from "fluent-ffmpeg";

export function checkVideoCodec(videoPath: string, videoCodec: string) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        return reject(err);
      }
      const vidoStreams = metadata.streams.filter(
        (stream) => stream.codec_type === "video"
      );

      const currentCodec = vidoStreams.find(
        (stream) => stream.codec_name === videoCodec
      );
      return resolve(Boolean(currentCodec));
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
