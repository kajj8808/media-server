import path from "path";
import WebTorrent from "webtorrent";
import fs, { rmdirSync, rmSync } from "fs";
import { streamingFormatConverter } from "./ffmpeg";
import { DIR_NAME, FRONT_URL, VIDEO_FOLDER_DIR } from "./constants";
import db from "./db";
import { getEpisodeDetail } from "../data/tmdb";
import crypto from "crypto";
import { uploadMessageToDiscordChannel } from "./discord";

interface TorrentDownloadeHandlerProps {
  magnet: string;
  tmdbId: number;
  seriesId: number;
  seasonId: number;
  excludedEpisodeCount: number | null;
}
export function torrentDownloadeHandler({
  magnet,
  seasonId,
  seriesId,
  excludedEpisodeCount,
}: TorrentDownloadeHandlerProps) {
  const client = new WebTorrent({
    nodeId: magnet,
  });
  client.add(magnet, { path: VIDEO_FOLDER_DIR }, async (torrent) => {
    if (torrent.files.length <= 1) {
      let episodeNumber = extractEpisodeNumber(torrent.files[0].name);
      if (excludedEpisodeCount && episodeNumber) {
        episodeNumber -= excludedEpisodeCount;
      }
      const episodeDetail = await getEpisodeDetail(seasonId, episodeNumber!);
      if (episodeDetail.status_code === 34 || episodeDetail.overview === "") {
        console.error("tmdb에 설명글이 없습니다.");
        torrent.removeAllListeners();
        torrent.destroy();
        return;
      }
    }
    // 5초마다 다운 진행도 출력
    const interval = setInterval(() => {
      console.log(
        torrent.name + "Progress: " + (torrent.progress * 100).toFixed(1) + "%"
      );
    }, 5000);
    if (torrent.name.includes("(ITA)")) {
      const cipherMagnet = crypto
        .createHash("md5")
        .update(magnet)
        .digest("base64");
      await db.downloadedMagnet.create({
        data: {
          cipher_magnet: cipherMagnet,
        },
      });
      try {
        rmSync(path.join(VIDEO_FOLDER_DIR, torrent.name), {
          recursive: true,
        });
        torrent.removeAllListeners();
        torrent.destroy();
      } catch (error) {
        console.log(error);
      }

      return;
    }

    torrent.on("error", (error: any) => {
      console.log(error);
      torrent.removeAllListeners();
      client.destroy();
    });

    torrent.on("done", async () => {
      clearInterval(interval);

      if (torrent.files.length > 1) {
        for (const file of torrent.files) {
          if (
            file.name.includes(".mkv") ||
            (file.name.includes(".mp4") && !file.name.includes("[SP"))
          ) {
            await episodeUploadHandler({
              filename: file.name,
              magnet,
              seasonId,
              seriesId,
            });
          }
        }
        rmdirSync(path.join(VIDEO_FOLDER_DIR, torrent.name), {
          recursive: true,
        });
      } else {
        await episodeUploadHandler({
          filename: torrent.name,
          magnet,
          seasonId,
          seriesId,
        });
        rmSync(path.join(VIDEO_FOLDER_DIR, torrent.name), {
          recursive: true,
        });
      }
      client.destroy((err) => console.error(err));
    });
  });
}

/* client.add(magnet); */
/** 정규 표현식을 사용하여 파일 이름에서 에피소드 번호 추출 */
export function extractEpisodeNumber(filename: string) {
  const parts = filename.split(/[ _\-()]/);
  let episodeNumber: number | null = null;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // 1. [1080p] 앞이나 [] 앞의 숫자 2~3개
    if (part.length === 2 || part.length === 3) {
      const nextPart = parts[i + 1];
      if (nextPart && /^\[/.test(nextPart)) {
        episodeNumber = parseInt(part, 10);
        break;
      }
    }

    // 2. - 이후의 값이 될 가능성이 높음
    if (part === "-") {
      const nextPart = parts[i + 1];
      if (nextPart) {
        const num = parseInt(nextPart, 10);
        if (!isNaN(num) && num >= 1 && num <= 99) {
          episodeNumber = num;
          break;
        }
      }
    }

    // 3. .mkv 확장자 이전에 나올 가능성 높음
    const lastDotIndex = part.lastIndexOf(".");
    if (lastDotIndex !== -1) {
      const numPart = part.slice(0, lastDotIndex);
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num >= 1 && num <= 99) {
        episodeNumber = num;
        break;
      }
    }
  }

  if (episodeNumber === null) {
    const episodeRegex = /\b(\d+)\b/;
    const match = filename.match(episodeRegex);
    if (match) {
      episodeNumber = parseInt(match[1], 10);
    }
  }

  return episodeNumber;
}

interface EpisodeUploadHandlerProps {
  filename: string;
  seasonId: number;
  seriesId: number;
  magnet: string;
}
async function episodeUploadHandler({
  filename,
  seasonId,
  seriesId,
  magnet,
}: EpisodeUploadHandlerProps) {
  const oldPath = path.join(VIDEO_FOLDER_DIR, filename);
  const newPath = path.join(VIDEO_FOLDER_DIR, filename);
  fs.renameSync(oldPath, newPath);
  const episodeNumber = extractEpisodeNumber(filename);
  const videoId = await streamingFormatConverter(newPath);

  if (!episodeNumber) {
    return console.error("episode 번호가 없는거 같습니다?..");
  }
  const episode = await getEpisodeDetail(seasonId, episodeNumber);
  const newEpisode = await db.episode.create({
    data: {
      title: episode.name,
      description: episode.overview,
      running_time: episode.runtime,
      thumnail: "http://image.tmdb.org/t/p/original/" + episode.still_path,
      video_id: videoId!,
      season_id: seasonId,
      series_id: seriesId,
      number: episodeNumber,
    },
  });
  const cipherMagnet = crypto.createHash("md5").update(magnet).digest("base64");
  await db.downloadedMagnet.create({
    data: {
      cipher_magnet: cipherMagnet,
      episode_id: newEpisode.id,
    },
  });
  await db.series.update({
    where: {
      id: seriesId,
    },
    data: {
      update_at: new Date(),
    },
  });
  uploadMessageToDiscordChannel({
    thumnail: newEpisode.thumnail,
    title: newEpisode.title,
    url: FRONT_URL,
  });
}
