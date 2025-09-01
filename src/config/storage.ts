import fs from "fs";

export interface IDriveConfig {
  path: string;
  priority: number;
  type: "primary" | "archive";
}

export interface IStorageConfig {
  drives: IDriveConfig[];
  defaultDrive: string;
}

export const STORAGE_CONFIG: IStorageConfig = {
  drives: [
    {
      path: "/mnt/c/media/videos",
      priority: 1,
      type: "primary",
    },
    {
      path: "/mnt/d/media/videos",
      priority: 2,
      type: "archive",
    },
  ],
  defaultDrive: "/mnt/c/media/videos",
};

export const SUBTITLE_STORAGE_CONFIG: IStorageConfig = {
  drives: [
    {
      path: "/mnt/c/media/subtitles",
      priority: 1,
      type: "primary",
    },
    {
      path: "/mnt/d/media/subtitles",
      priority: 2,
      type: "archive",
    },
  ],
  defaultDrive: "/mnt/c/media/subtitles",
};

export async function ensureStorageDirectories() {
  // Ensure video storage directories
  for (const drive of STORAGE_CONFIG.drives) {
    if (!fs.existsSync(drive.path)) {
      await fs.promises.mkdir(drive.path, { recursive: true });
      console.log(`Created video storage directory: ${drive.path}`);
    }
  }
  
  // Ensure subtitle storage directories
  for (const drive of SUBTITLE_STORAGE_CONFIG.drives) {
    if (!fs.existsSync(drive.path)) {
      await fs.promises.mkdir(drive.path, { recursive: true });
      console.log(`Created subtitle storage directory: ${drive.path}`);
    }
  }
}

export async function getDriveUsage(drivePath: string) {
  try {
    const stats = await fs.promises.statfs(drivePath);
    return {
      used: stats.bavail * stats.bsize,
      free: stats.bfree * stats.bsize,
    };
  } catch (error) {
    console.error(`Failed to get drive usage for ${drivePath}:`, error);
    return { used: 0, free: 0 };
  }
}

export async function getAvailableDrivesSortedByFreeSpace() {
  const availableDrives = STORAGE_CONFIG.drives.filter((drive) =>
    fs.existsSync(drive.path)
  );

  const drivesWithUsage = await Promise.all(
    availableDrives.map(async (drive) => {
      const usage = await getDriveUsage(drive.path);
      return { ...drive, freeSpace: usage.free };
    })
  );

  return drivesWithUsage.sort((a, b) => b.freeSpace - a.freeSpace);
}

export async function getAvailableSubtitleDrivesSortedByFreeSpace() {
  const availableDrives = SUBTITLE_STORAGE_CONFIG.drives.filter((drive) =>
    fs.existsSync(drive.path)
  );

  const drivesWithUsage = await Promise.all(
    availableDrives.map(async (drive) => {
      const usage = await getDriveUsage(drive.path);
      return { ...drive, freeSpace: usage.free };
    })
  );

  return drivesWithUsage.sort((a, b) => b.freeSpace - a.freeSpace);
}
