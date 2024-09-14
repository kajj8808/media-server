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
export async function readSubtitleFileData(filePath: string) {
  const fileData = fs.readFileSync(filePath);
  const encoding = chardet.detect(fileData);
  const decodeData = iconv.decode(fileData, encoding || "utf-8");

  return decodeData;
}
