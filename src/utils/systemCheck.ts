import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface SystemRequirement {
  name: string;
  command: string;
  required: boolean;
  description: string;
}

const SYSTEM_REQUIREMENTS: SystemRequirement[] = [
  {
    name: "FFmpeg",
    command: "ffmpeg -version",
    required: true,
    description: "비디오 변환 및 처리를 위해 필수"
  },
  {
    name: "FFprobe", 
    command: "ffprobe -version",
    required: true,
    description: "비디오 정보 분석을 위해 필수"
  }
];

export async function checkSystemRequirements(): Promise<void> {
  console.log("Checking system requirements...");
  
  const results = await Promise.allSettled(
    SYSTEM_REQUIREMENTS.map(async (req) => {
      try {
        await execAsync(req.command);
        console.log(`${req.name}: installed`);
        return { ...req, installed: true };
      } catch (error) {
        console.log(`${req.name}: not installed - ${req.description}`);
        return { ...req, installed: false, error };
      }
    })
  );

  const failedRequirements = results
    .filter((result, index) => {
      if (result.status === 'fulfilled') {
        const req = SYSTEM_REQUIREMENTS[index];
        return req.required && !result.value.installed;
      }
      return true;
    })
    .map((result, index) => SYSTEM_REQUIREMENTS[index]);

  if (failedRequirements.length > 0) {
    console.error("\nRequired system components not found:");
    failedRequirements.forEach(req => {
      console.error(`   - ${req.name}: ${req.description}`);
    });
    
    console.error("\nInstallation:");
    console.error("  Ubuntu/WSL: sudo apt update && sudo apt install ffmpeg");
    console.error("  macOS: brew install ffmpeg");
    console.error("  Windows: https://ffmpeg.org/download.html");
    
    process.exit(1);
  }

  console.log("All system requirements satisfied.\n");
}

export async function checkFFmpegAvailable(): Promise<boolean> {
  try {
    await execAsync("ffmpeg -version");
    return true;
  } catch {
    return false;
  }
}

// 런타임에서 FFmpeg 사용 전 체크
export async function ensureFFmpegAvailable(): Promise<void> {
  if (!(await checkFFmpegAvailable())) {
    throw new Error(
      "FFmpeg가 설치되지 않았습니다. 비디오 처리를 위해 FFmpeg 설치가 필요합니다."
    );
  }
}