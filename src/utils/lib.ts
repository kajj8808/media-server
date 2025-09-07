import { extractEpisodeNumberWithLogging } from "@services/errorLogger";

/** 정규 표현식을 사용하여 파일 이름에서 에피소드 번호 추출 (에러 로깅 포함) */
export function extractEpisodeNumber(filename: string): number | null {
  return extractEpisodeNumberWithLogging(filename);
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

import crypto from "crypto";
import type { SeriesStatus } from "@prisma/client";
export function convertPlaintextToCipherText(plaintext: string) {
  const cipherText = crypto
    .createHash("md5")
    .update(plaintext)
    .digest("base64");
  return cipherText;
}

export function convertTmdbStatus(tmdbStatus: string): SeriesStatus {
  const dic: { [key: string]: SeriesStatus } = {
    Ended: "COMPLETED",
    "Returning Series": "ONGOING",
    "In Production": "UPCOMING",
  };

  // TMDB 상태를 변환된 상태로 반환, 변환되지 않은 상태는 "UPCOMING"으로 처리
  return dic[tmdbStatus] || "UPCOMING";
}

export async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, ms);
  });
}

export async function getUnmatchedVideoFiles(
  videoContents: { watch_id: string }[]
) {
  const videoFiles = fs.readdirSync("./public/video");

  const notFoundFiles = videoFiles.filter(
    (videoFile) =>
      !videoContents.find((videoContet) => videoContet.watch_id === videoFile)
  );
  return notFoundFiles;
}
