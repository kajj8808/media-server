/** 정규 표현식을 사용하여 파일 이름에서 에피소드 번호 추출 */
export function extractEpisodeNumber(filename: string): number | null {
  const parts = filename.split(/[ _\-()]/);
  let episodeNumber: number | null = null;
  // 1 -> 2 이런 순서로 우선도 높게 설정
  // 1. 파일 확장자 직전의 숫자 우선 추출
  const extensionRegex = /(\d+)(?:\.\w+)?$/;
  const extensionMatch = filename.match(extensionRegex);
  if (extensionMatch) {
    const num = parseInt(extensionMatch[1], 10);
    if (num >= 1 && num <= 999) {
      return num;
    }
  }

  // 2.hyphen (-) 뒤의 숫자를 찾음.
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === "-") {
      const nextPart = parts[i + 1];
      if (nextPart) {
        const num = parseInt(nextPart, 10);
        if (!isNaN(num) && num >= 1 && num <= 999) {
          return num;
        }
      }
    }
  }

  // 3. 1080 과 같은 태그 앞의 숫자를 찾는걸 3번째 로직
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const num = parseInt(part, 10);
    if (!isNaN(num) && num >= 1 && num <= 999) {
      const nextPart = parts[i + 1];
      if (nextPart && /^\[/.test(nextPart)) {
        return num;
      }
    }
  }

  // 4. 마지막으로 못찾음면 그냥 파일안의 1~999 사이의 숫자를 찾음
  const generalEpisodeRegex = /\b([1-9]\d{0,2})\b/;
  const match = filename.match(generalEpisodeRegex);
  if (match) {
    return parseInt(match[1], 10);
  }

  return null;
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
