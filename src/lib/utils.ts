export function makeTMDBImageURL(tmdbImageId: string) {
  return `https://image.tmdb.org/t/p/original/${tmdbImageId}`;
}
/** sleep ( second ) */
export async function sleep(second: number) {
  return new Promise((resolve) => setTimeout(resolve, second * 1000));
}

import { getAverageColor } from "fast-average-color-node";
export async function getProminentColorHexCode(imageUrl: string) {
  let hexCode;
  try {
    // hexCode = (await Vibrant.from(imageUrl).getPalette()).Vibrant?.hex; <- webp 지원 x
    hexCode = (await getAverageColor(imageUrl)).hex;
  } catch (error) {
    console.log(error);
  }

  return hexCode ?? "#1f1f1f";
}

import fs from "fs";
import iconv from "iconv-lite";
import chardet from "chardet";
import db from "./db";
import { VIDEO_FOLDER_DIR } from "./constants";
import path from "path";
export async function readSubtitleFileData(filePath: string) {
  const fileData = fs.readFileSync(filePath);
  const encoding = chardet.detect(fileData);
  const decodeData = iconv.decode(fileData, encoding || "utf-8");

  return decodeData;
}
export async function clenupVideos() {
  const episodes = await db.episode.findMany({
    select: {
      video_id: true,
    },
  });

  const videoIds = fs.readdirSync(VIDEO_FOLDER_DIR);
  const notExists = videoIds;

  for (let episode of episodes) {
    for (let videoId of videoIds) {
      if (videoId === episode.video_id) {
        notExists.pop();
        break;
      }
    }
  }

  notExists.forEach((videoId) => {
    const videoPath = path.join(VIDEO_FOLDER_DIR, videoId);
    console.log(videoPath);
  });
}
