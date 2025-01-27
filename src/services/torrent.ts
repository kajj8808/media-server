/// torrent 관련 파일 처리 + DB 상호 작용 외부 API 요청 처리를 위한 파일.

import webTorrent from "webtorrent";
import path from "path";

import { DIR_NAME } from "utils/constants";
import { convertToStreamableVideo } from "./streaming";
import { extractEpisodeNumber } from "utils/lib";

interface VideoInfo {
  videoId: string;
  episodeNumber: number | null;
}

// 비디오 파일인지 확인하는 함수
function isVideoFile(fileName: string): boolean {
  return (
    fileName.endsWith(".mp4") ||
    fileName.endsWith(".mkv") ||
    fileName.endsWith(".avi") ||
    fileName.endsWith(".webm")
  );
}

export async function downloadVideoFileFormTorrent(magnetURI: string) {
  const client = new webTorrent();
  const TEMP_DIR = path.join(DIR_NAME, "../../", "public", "temp");
  const videoInfos: VideoInfo[] = [];
  await new Promise((resolve, reject) => {
    client.add(magnetURI, { path: TEMP_DIR }, (torrent) => {
      const interval = setInterval(() => {
        console.log(
          torrent.name +
            "Progress: " +
            (torrent.progress * 100).toFixed(1) +
            "%"
        );
      }, 5000);

      torrent.on("error", (error) => {
        console.error(`downloadFileFormTorrent error: ${error}`);
        reject(error);
      });

      torrent.on("done", async () => {
        clearInterval(interval);
        if (torrent.files.length > 1) {
          for (const file of torrent.files) {
            if (isVideoFile(file.name)) {
              const episodeNumber = extractEpisodeNumber(file.name);
              const videoId = await convertToStreamableVideo(
                `${TEMP_DIR}/${file.name}`
              );
              videoInfos.push({
                videoId,
                episodeNumber,
              });
            }
          }
        } else {
          const file = torrent.files[0];
          if (file) {
            if (isVideoFile(file.name)) {
              const episodeNumber = extractEpisodeNumber(file.name);
              const videoId = await convertToStreamableVideo(
                `${TEMP_DIR}/${file.name}`
              );
              videoInfos.push({
                videoId,
                episodeNumber,
              });
            }
          }
        }
        resolve(videoInfos);
      });
    });
  });
  return videoInfos;
}

/* 
Test
downloadVideoFileFormTorrent(
  ""
);
 */
