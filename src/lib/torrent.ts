import path from "path";
import WebTorrent from "webtorrent";
import fs, { rmdirSync, rmSync } from "fs";
import { streamingFormatConverter } from "./ffmpeg";
import { FRONT_URL, VIDEO_FOLDER_DIR } from "./constants";
import db from "./db";
import { getEpisodeDetail, getMovieDetail } from "../data/tmdb";
import crypto from "crypto";
import { uploadMessageToDiscordChannel } from "./discord";
import { EpisodeData } from "../../types/interfaces";

interface EpisodeDownloadeHandlerProps {
  magnet: string;
  tmdbId: number;
  seriesId: number;
  seasonId: number;
}
export function episodeDownloadeHandler({
  magnet,
  seasonId,
  seriesId,
}: EpisodeDownloadeHandlerProps) {
  const client = new WebTorrent({
    nodeId: magnet,
    utp: false,
  });
  client.add(magnet, { path: VIDEO_FOLDER_DIR }, async (torrent) => {
    // 5초마다 다운 진행도 출력
    const interval = setInterval(() => {
      console.log(
        torrent.name + "Progress: " + (torrent.progress * 100).toFixed(1) + "%"
      );
    }, 5000);

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
  try {
    const oldPath = path.join(VIDEO_FOLDER_DIR, filename);
    const newPath = path.join(VIDEO_FOLDER_DIR, filename);
    fs.renameSync(oldPath, newPath);
    const episodeNumber = extractEpisodeNumber(filename);
    const videoId = await streamingFormatConverter({ videoPath: newPath });

    if (!videoId) {
      return console.error(
        "streamingFormatConverter에서 문제가 생긴거 같습니다."
      );
    }

    if (!episodeNumber) {
      return console.error("episode 번호가 없는거 같습니다?..");
    }
    const episode = await getEpisodeDetail(seasonId, episodeNumber);

    let data: EpisodeData;
    if (episode.status_code === 34 || episode.overview === "") {
      data = {
        title: `${episode.series_name} ${episode.name}`,
        description: episode.overview,
        running_time: episode.runtime,
        thumnail: "http://image.tmdb.org/t/p/original/" + episode.still_path,
        video_id: videoId,
        season_id: seasonId,
        series_id: seriesId,
        number: episodeNumber,
        kr_description: false,
      };
    } else {
      data = {
        title: episode.name,
        description: episode.overview,
        running_time: episode.runtime,
        thumnail: "http://image.tmdb.org/t/p/original/" + episode.still_path,
        video_id: videoId,
        season_id: seasonId,
        series_id: seriesId,
        number: episodeNumber,
        kr_description: true,
      };
    }

    let newEpisode = await db.episode.create({
      data,
    });
    const cipherMagnet = crypto
      .createHash("md5")
      .update(magnet)
      .digest("base64");

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

    await db.season.update({
      where: {
        id: seasonId,
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
  } catch (error) {
    console.error(`episodeUploadHandler error: ${error}`);
  }
}

interface MovieDownloadeHandlerProps {
  magnet: string;
  movieId: number;
  seriesId: number;
}
export function movieDownloadeHandler({
  magnet,
  movieId,
  seriesId,
}: MovieDownloadeHandlerProps) {
  const client = new WebTorrent({
    nodeId: magnet,
    utp: false,
  });
  client.add(magnet, { path: VIDEO_FOLDER_DIR }, async (torrent) => {
    // 5초마다 다운 진행도 출력
    const interval = setInterval(() => {
      console.log(
        torrent.name + "Progress: " + (torrent.progress * 100).toFixed(1) + "%"
      );
    }, 5000);

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
            await movieUploadHandler({
              magnet,
              movieId,
              filename: file.name,
              seriesId: seriesId,
            });
          }
        }
        rmdirSync(path.join(VIDEO_FOLDER_DIR, torrent.name), {
          recursive: true,
        });
      } else {
        await movieUploadHandler({
          magnet,
          movieId,
          filename: torrent.name,
          seriesId: seriesId,
        });
        rmSync(path.join(VIDEO_FOLDER_DIR, torrent.name), {
          recursive: true,
        });
      }
      client.destroy((err) => console.error(err));
    });
  });
}
interface MovieUploadHandlerProps {
  magnet: string;
  movieId: number;
  seriesId: number;
  filename: string;
}
async function movieUploadHandler({
  magnet,
  movieId,
  seriesId,
  filename,
}: MovieUploadHandlerProps) {
  const movieDetail = await getMovieDetail(movieId);
  const newPath = path.join(VIDEO_FOLDER_DIR, filename);
  const videoId = await streamingFormatConverter({
    videoPath: newPath,
    audioCodec: "flac",
  });

  if (!videoId) {
    console.error("Movie Upload Handler error : video id");
    return;
  }

  const newEpisode = await db.episode.create({
    data: {
      thumnail: movieDetail.backdrop_path,
      title: movieDetail.title,
      video_id: videoId,
      description: movieDetail.overview,
      running_time: movieDetail.runtime,
      number: 0,
      series: {
        connect: {
          id: seriesId,
        },
      },
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
    where: { id: seriesId },
    data: { update_at: new Date() },
  });
}
