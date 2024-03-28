import { PrismaClient } from "@prisma/client";

export const prismaClient = new PrismaClient();

export function extractEpisodeNumber(filename: string) {
  // 정규 표현식을 사용하여 파일 이름에서 에피소드 번호 추출
  const match = filename.match(/(?:^|\D)(\d+)(?=\D|$)/);
  if (match) {
    const episodeNumber = match[1];
    return episodeNumber;
  } else {
    return null;
  }
}
