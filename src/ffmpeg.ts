import ffmpegPath from "ffmpeg-static";
import { spawn } from "child_process";

export function hevcToHvc1(filePath: string) {
  return new Promise<void>((resolve, reject) => {
    const command = `${ffmpegPath} -i ${filePath} -c:v copy -c:a copy -tag:v hvc1 ${filePath}`;

    const process = spawn(command, { shell: true });

    process.on("error", (error) => {
      reject(error);
    });

    process.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(code);
      }
    });
  });
}
