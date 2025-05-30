/// torrent 관련 파일 처리 + DB 상호 작용 외부 API 요청 처리를 위한 파일.

import webTorrent from "webtorrent";
import path from "path";

import { DIR_NAME } from "utils/constants";
import { convertToStreamableVideo } from "./streaming";
import { extractEpisodeNumber } from "utils/lib";

interface VideoInfo {
  videoId: string;
  episodeNumber: number;
  magnetUrl: string;
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

const trackers = [
  "udp://open.stealth.si:80/announce",
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://tracker.coppersurfer.tk:6969/announce",
  "udp://tracker.openbittorrent.com:80/announce",
  "udp://tracker.leechers-paradise.org:6969/announce",
  "udp://tracker.internetwarriors.net:1337/announce",
  "wss://tracker.openwebtorrent.com",
];

export async function downloadVideoFileFormTorrent(magnetURI: string) {
  const client = new webTorrent({
    maxConns: 50,
  });
  client.throttleDownload(-1);

  const TEMP_DIR = path.join(DIR_NAME, "../../", "public", "temp");
  const videoInfos: VideoInfo[] = [];
  await new Promise((resolve, reject) => {
    client.add(magnetURI, { path: TEMP_DIR, announce: trackers }, (torrent) => {
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
            if (isVideoFile(file.name) && !file.name.includes("[SP")) {
              const episodeNumber = extractEpisodeNumber(file.name);
              const videoId = await convertToStreamableVideo(
                `${TEMP_DIR}/${torrent.name}/${file.name}`
              );
              videoInfos.push({
                videoId,
                episodeNumber: episodeNumber ? episodeNumber : 1,
                magnetUrl: magnetURI,
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
                episodeNumber: episodeNumber ? episodeNumber : 1,
                magnetUrl: magnetURI,
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
