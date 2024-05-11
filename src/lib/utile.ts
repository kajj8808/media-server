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
