export async function sleep(second: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, second * 1000);
  });
}

import fs from "fs";
export async function changePath(prevPath: string, newPath: string) {
  try {
    fs.renameSync(prevPath, newPath);
  } catch (error) {
    console.error(error);
  }
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
