import path from "path";
import WebTorrentHybrid from "webtorrent-hybrid";
import crypto from "crypto";
import fs from "fs";

import { streamingFormatConverter } from "./ffmpeg";
import { fetchEpisodeDetail } from "../tmdb";
import { changePath } from "./utile";
import db from "./db";
import { uploadMessageToDiscordChannel } from "./discord";

interface IEpisdoePush {
  tmdbId: number;
  seriesId: number;
  seasonId: number;
  episodeNumber: number;
  seasonNumber: number;
  videoId: string;
  magnet: string;
}

async function episdePushHandler({
  tmdbId,
  seriesId,
  seasonId,
  episodeNumber,
  seasonNumber,
  videoId,
  magnet,
}: IEpisdoePush) {
  const season = await db.season.findUnique({
    where: {
      id: seasonId,
    },
  });
  const excludedEpisodeCount = season?.excludedEpisodeCount;

  let episodeDetail;
  if (excludedEpisodeCount) {
    episodeDetail = await fetchEpisodeDetail(
      tmdbId,
      seasonNumber,
      episodeNumber + excludedEpisodeCount
    );
  } else {
    episodeDetail = await fetchEpisodeDetail(
      tmdbId,
      seasonNumber,
      episodeNumber
    );
  }

  try {
    const episode = await db.episode.create({
      data: {
        number: excludedEpisodeCount
          ? episodeDetail.episode_number - excludedEpisodeCount
          : episodeDetail.episode_number,
        description: episodeDetail.overview,
        runningTime: episodeDetail.runtime,
        thumnail:
          "http://image.tmdb.org/t/p/original/" + episodeDetail.still_path,
        title: episodeDetail.name,
        videoId: +videoId,
        seasonId: seasonId,
      },
    });

    const cipherMagnet = crypto
      .createHash("md5")
      .update(magnet)
      .digest("base64");
    await db.downloadedMagnet.create({
      data: {
        cipherMagnet: cipherMagnet,
        episodeId: episode.id,
      },
    });

    const series = await db.series.update({
      where: { id: seriesId },
      data: { updateAt: new Date() },
    });

    uploadMessageToDiscordChannel({
      thumnail:
        "http://image.tmdb.org/t/p/original/" + episodeDetail.still_path,
      title: `${series.title}-${episodeDetail.episode_number}.${episodeDetail.name}`,
      url: `${process.env.BASE_SITE_URL}/watch/${episode.id}`,
    });
  } catch (error) {
    console.log(error);
  }
}

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

  console.log(episodeNumber);
  return episodeNumber;
}

interface ITorrentDownloadHandler {
  torrentId: string;
  tmdbId: number;
  seriesId: number;
  seasonId: number;
  seasonNumber: number;
  excludedEpisodeCount?: number;
}
export function torrentDownloadeHandler({
  torrentId,
  tmdbId,
  seriesId,
  seasonId,
  seasonNumber,
  excludedEpisodeCount,
}: ITorrentDownloadHandler) {
  const client = new WebTorrentHybrid({
    nodeId: torrentId,
  });

  client.add(
    torrentId,
    { path: path.join(__dirname, "../../public", "video") },
    async (torrent) => {
      if (torrent.files.length <= 1) {
        let episodeNumber = extractEpisodeNumber(torrent.files[0].name);
        if (excludedEpisodeCount && episodeNumber) {
          episodeNumber -= excludedEpisodeCount;
        }
        const episodeDetail = await fetchEpisodeDetail(
          tmdbId,
          seasonNumber,
          episodeNumber!
        );
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
          torrent.name +
            "Progress: " +
            (torrent.progress * 100).toFixed(1) +
            "%"
        );
      }, 5000);

      torrent.on("error", (error: any) => {
        console.log(error);
        torrent.removeAllListeners();
        client.destroy();
      });

      torrent.on("done", async () => {
        clearInterval(interval);
        // 토렌트가 폴더일떄.
        if (torrent.files.length > 1) {
          for (const file of torrent.files) {
            if (
              (file.name.includes("mkv") || file.name.includes("mp4")) &&
              !file.name.includes("[SP")
            ) {
              const prevPath = path.join(
                __dirname,
                "../../public",
                "video",
                torrent.name,
                file.name
              );
              const newPath = path.join(
                __dirname,
                "../../public",
                "video",
                file.name
              );
              await changePath(prevPath, newPath);
              const episodeNumber = extractEpisodeNumber(file.name);
              const videoId = await streamingFormatConverter(newPath);
              if (!videoId || !episodeNumber) return;
              await episdePushHandler({
                videoId: videoId,
                seriesId: seriesId,
                seasonId: seasonId,
                seasonNumber: seasonNumber,
                tmdbId: tmdbId,
                episodeNumber: excludedEpisodeCount
                  ? episodeNumber + excludedEpisodeCount
                  : episodeNumber,
                magnet: torrentId,
              });
            }
          }

          fs.rmSync(
            path.join(__dirname, "../../public", "video", torrent.name)
          );
          torrent.removeAllListeners();
          torrent.destroy();
        } else {
          const videoPath = path.join(
            __dirname,
            "../../public",
            "video",
            torrent.files[0].name
          );
          const episodeNumber = extractEpisodeNumber(torrent.files[0].name);
          const videoId = await streamingFormatConverter(videoPath);

          if (!videoId || !episodeNumber) return;

          await episdePushHandler({
            videoId: videoId,
            seasonId: seasonId,
            seriesId: seriesId,
            tmdbId: tmdbId,
            seasonNumber: seasonNumber,
            episodeNumber: episodeNumber,
            magnet: torrentId,
          });

          torrent.removeAllListeners();
          torrent.destroy();
        }
      });
    }
  );
}
