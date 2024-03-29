import fs from "fs";
import WebTorrent from "webtorrent";
import crypto from "crypto";
import { extractEpisodeNumber, prismaClient } from "./util/client";
import path from "path";
import { IDetail } from "./interfaces";
import { Readable } from "stream";
import { hevcToHvc1 } from "./ffmpeg";

const torrentClient = new WebTorrent({
  maxConns: 50, // 동시 연결 수 제한
});

const FILE_DIR = `${__dirname}/public/json/magnet_hash_list.json`;

interface ITorrentDownloadHandler {
  torrentId: string;
  tmdbId: string;
  seriesId: number;
  seasonId: number;
  seasonNumber: number;
}

export function torrentDownloadHandler({
  torrentId,
  tmdbId,
  seriesId,
  seasonId,
  seasonNumber,
}: ITorrentDownloadHandler) {
  torrentClient.add(
    torrentId,
    { path: `${__dirname}/public/video` },
    async (torrent) => {
      const videoFile = torrent.files.find(
        (file) => file.name.endsWith(".mkv") || file.name.endsWith(".mp4")
      );
      if (!videoFile || videoFile.length > 1) return;

      torrent.on("done", async () => {
        const episodeNumber = extractEpisodeNumber(videoFile.name);
        if (!episodeNumber) return console.error("not found episode number...");
        // video file이 저장 되어있는 위치.
        const videoFilePath = path.join(
          __dirname,
          "public",
          "video",
          videoFile.name
        );

        const filename = `${new Date().getTime()}`;
        const newPath = path.join(__dirname, "public", "video", filename);
        const tempPath = newPath + ".mkv";
        try {
          await hevcToHvc1(videoFilePath, tempPath);
        } catch (error) {
          console.log(error);
        }

        fs.renameSync(tempPath, newPath);
        fs.unlinkSync(videoFilePath);

        const episodeDetails = (await fetchEpisodeDetails(
          tmdbId,
          seasonNumber,
          episodeNumber
        )) as IDetail;

        await saveEpisodeDetails(episodeDetails, filename, seasonId, seriesId);
        await prismaClient.series.update({
          where: { id: seriesId },
          data: { updatedAt: new Date() },
        });
      });
    }
  );
}

async function fetchEpisodeDetails(
  tmdbId: string,
  seasonNumber: number,
  episodeNumber: number
) {
  const url = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}?language=ko-KR`;
  const options = {
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
    },
  };

  try {
    const response = await fetch(url, options);
    return await response.json();
  } catch (error) {
    console.error("Error fetching episode details:", error);
    throw error;
  }
}

async function saveEpisodeDetails(
  details: IDetail,
  filename: string,
  seasonId: number,
  seriesId: number
) {
  try {
    await prismaClient.episode.create({
      data: {
        title: details.name,
        description: details.overview,
        videoId: filename,
        runtime: details.runtime,
        episodeNumber: details.episode_number,
        seasonId,
        seriesId,
      },
    });
  } catch (error) {
    console.error("Error saving episode details:", error);
    throw error;
  }
}

function parseMagnetHashFile(): string[] {
  const readData = fs.readFileSync(FILE_DIR, { encoding: "utf-8" });
  const arrayData = JSON.parse(readData);
  return arrayData;
}

export function saveMagnet(magnet: string) {
  try {
    const hash = crypto.createHash("sha256").update(magnet).digest("base64");
    const prevList = parseMagnetHashFile();
    if (prevList.includes(hash)) return;
    fs.writeFileSync(FILE_DIR, JSON.stringify([...prevList, hash]));
  } catch (error) {
    console.error(error);
  }
}

export function checkMagnetExists(magnet: string) {
  try {
    const hash = crypto.createHash("sha256").update(magnet).digest("base64");
    const prevList = parseMagnetHashFile();
    if (prevList.includes(hash)) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error(error);
  }
}
