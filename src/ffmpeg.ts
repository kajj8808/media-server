import ffmpegPath from "ffmpeg-static";
import { exec } from "child_process";

export function hevcToHvc1(filePath: string) {
  const command = `${ffmpegPath} -i ${filePath} -c:v copy -c:a copy -tag:v hvc1 ${filePath}`;
  exec(command, (error) => {
    if (error) {
      console.error(error);
    }
  });
}
