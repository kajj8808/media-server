import fs from "fs";
import path from "path";
import {
  STORAGE_CONFIG,
  SUBTITLE_STORAGE_CONFIG,
  getAvailableDrivesSortedByFreeSpace,
  getAvailableSubtitleDrivesSortedByFreeSpace,
  ensureStorageDirectories,
} from "../config/storage";

export async function findVideoFile(videoId: string) {
  // 1. First check new WSL storage locations
  for (const drive of STORAGE_CONFIG.drives) {
    const filePath = path.join(drive.path, videoId);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  
  // 2. Fallback: check legacy public/video directory
  const legacyPath = path.join(process.cwd(), "public", "video", videoId);
  if (fs.existsSync(legacyPath)) {
    console.log(`Found video in legacy location: ${legacyPath}`);
    return legacyPath;
  }
  
  return null;
}

export async function getBestStoragePath(): Promise<string> {
  await ensureStorageDirectories();
  const sortedDrives = await getAvailableDrivesSortedByFreeSpace();

  if (sortedDrives.length === 0) {
    throw new Error("No available storage drives found");
  }

  return sortedDrives[0].path;
}

export async function saveVideoFile(videoId: string, sourcePath: string) {
  const storagePath = await getBestStoragePath();
  const targetPath = path.join(storagePath, videoId);

  await fs.promises.copyFile(sourcePath, targetPath);
  console.log(`Video saved: ${videoId} -> ${targetPath}`);

  return targetPath;
}

export async function moveVideoFile(
  videoId: string,
  fromDrive: string,
  toDrive: string
) {
  const fromPath = path.join(fromDrive, videoId);
  const toPath = path.join(toDrive, videoId);

  if (!fs.existsSync(fromPath)) {
    throw new Error(`Source file not found: ${fromPath}`);
  }

  await ensureStorageDirectories();
  await fs.promises.copyFile(fromPath, toPath);
  await fs.promises.unlink(fromPath);

  console.log(`Video moved: ${fromPath} -> ${toPath}`);
  return toPath;
}

export async function getAllVideoFiles() {
  const allFiles: { videoId: string; path: string; drive: string }[] = [];

  for (const drive of STORAGE_CONFIG.drives) {
    if (fs.existsSync(drive.path)) {
      const files = await fs.promises.readdir(drive.path);
      for (const file of files) {
        const filePath = path.join(drive.path, file);
        allFiles.push({
          videoId: file,
          path: filePath,
          drive: drive.path,
        });
      }
    }
  }

  return allFiles;
}

// Subtitle storage functions
export async function findSubtitleFile(subtitleId: string) {
  // 1. First check new WSL subtitle storage locations
  for (const drive of SUBTITLE_STORAGE_CONFIG.drives) {
    const filePath = path.join(drive.path, subtitleId);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  
  // 2. Fallback: check legacy public/subtitle directory
  const legacyPath = path.join(process.cwd(), "public", "subtitle", subtitleId);
  if (fs.existsSync(legacyPath)) {
    console.log(`Found subtitle in legacy location: ${legacyPath}`);
    return legacyPath;
  }
  
  return null;
}

export async function getBestSubtitleStoragePath(): Promise<string> {
  await ensureStorageDirectories();
  const sortedDrives = await getAvailableSubtitleDrivesSortedByFreeSpace();

  if (sortedDrives.length === 0) {
    throw new Error("No available subtitle storage drives found");
  }

  return sortedDrives[0].path;
}

export async function saveSubtitleFile(subtitleId: string, content: string) {
  const storagePath = await getBestSubtitleStoragePath();
  const targetPath = path.join(storagePath, subtitleId);

  await fs.promises.writeFile(targetPath, content, 'utf8');
  console.log(`Subtitle saved: ${subtitleId} -> ${targetPath}`);

  return targetPath;
}
