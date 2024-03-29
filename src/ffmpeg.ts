import ffmpegPath from "ffmpeg-static";
import { spawn } from "child_process";

export function hevcToHvc1(filePath: string, tempPath: string) {
  return new Promise<void>((resolve, reject) => {
    const command = `${ffmpegPath} -y -i "${filePath}" -c:v copy -c:a copy -tag:v hvc1 "${tempPath}"`;

    const process = spawn(command, { shell: true, stdio: "pipe" });

    process.on("error", (error) => {
      console.error("Failed to start process:", error);
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
