import { PrismaClient } from "@prisma/client";
import { createTmdbImageUrl, getEpisodeDetail, getSeries } from "./tmdb";
import type { Season, TMDBSeries } from "types/tmdb";
import crypto from "crypto";
import { getNyaaMagnets } from "./web-scraper";
import { downloadVideoFileFormTorrent } from "./torrent";

const db = new PrismaClient();

export default db;

interface Genre {
  id: number;
  name: string;
}
export async function upsertGenres(genres: Genre[]) {
  return await Promise.all(
    genres.map((genre) =>
      db.genres.upsert({
        create: { name: genre.name, id: genre.id },
        update: { name: genre.name },
        where: { id: genre.id },
      })
    )
  );
}

export async function upsertSeries(
  seriesId: number,
  series: TMDBSeries,
  genres: Genre[]
) {
  const seriesData = {
    title: series.name,
    cover_image: createTmdbImageUrl(series.backdrop_path),
    overview: series.overview,
    genres: {
      connect: genres,
    },
    poster: createTmdbImageUrl(series.poster_path),
    homepage: series.homepage,
    next_episode_to_air: series.next_episode_to_air
      ? new Date(series.next_episode_to_air.air_date)
      : null,
  };

  return await db.series.upsert({
    create: {
      ...seriesData,
      id: +seriesId,
    },
    update: seriesData,
    where: {
      id: +seriesId,
    },
  });
}

export async function upsertSeasons(seriesId: number, seasons: Season[]) {
  return await Promise.all(
    seasons.map((season) => {
      const seasonData = {
        name: season.name,
        number: season.season_number,
        air_date: new Date(season.air_date),
        series_id: +seriesId,
        poster: createTmdbImageUrl(season.poster_path),
      };
      return db.season.upsert({
        create: {
          id: +season.id,
          ...seasonData,
        },
        update: {
          ...seasonData,
        },
        where: { id: +season.id },
      });
    })
  );
}

interface UpsertEpisodeProps {
  seasonId: number;
  episodeNumber: number;
  magnetUrl: string;
  videoId: string;
}

export async function upsertEpisode({
  seasonId,
  episodeNumber,
  magnetUrl,
  videoId,
}: UpsertEpisodeProps) {
  try {
    const cipherMagnet = crypto
      .createHash("md5")
      .update(magnetUrl)
      .digest("base64");

    const newMagnet = await db.magnet.create({
      data: { cipher_magnet: cipherMagnet },
    });

    const season = await db.season.findUnique({
      where: { id: +seasonId },
      select: {
        id: true,
        number: true,
        series: { select: { id: true } },
      },
    });
    if (!season) return;

    const episodeDetail = await getEpisodeDetail(
      season.series.id,
      season.number,
      episodeNumber
    );

    if (!episodeDetail) return;

    const episodeData = {
      id: +episodeDetail.id,
      magnet_id: newMagnet.id,
      number: episodeDetail.episode_number,
      season_id: +season.id,
      series_id: +season.series.id,
      title: episodeDetail.name,
      video_id: videoId,
      description: episodeDetail.overview,
      kr_description: episodeDetail.overview !== "",
      thumbnail: createTmdbImageUrl(episodeDetail.still_path),
      running_time: episodeDetail.runtime,
    };

    const updatedEpisode = await db.episode.upsert({
      create: episodeData,
      update: episodeData,
      where: { id: +episodeDetail.id },
    });
    return updatedEpisode;
  } catch (error) {
    console.error(`upsertEpisode error: ${error}`);
  }
}

export async function checkMagnetsExist(magnets: string[]) {
  const magnetInfos = magnets.map((magnet) => ({
    cipherMagnet: crypto.createHash("md5").update(magnet).digest("base64"),
    magnet,
  }));

  const existChecks = magnetInfos.map(async (magnetInfo) => {
    const exist = await db.magnet.findFirst({
      where: {
        cipher_magnet: magnetInfo.cipherMagnet,
      },
    });
    return exist ? null : magnetInfo.magnet;
  });

  const results = await Promise.all(existChecks);
  return results.filter((magnet) => magnet !== null) as string[];
}

interface UpdateData {
  seasonId: number;
  nyaa_query: string;
  auto_upload: boolean;
  is_4k: boolean;
  is_db: boolean;
}

export async function updateSeason(updateData: UpdateData) {
  await db.season.update({
    where: { id: +updateData.seasonId },
    data: {
      nyaa_query: updateData.nyaa_query,
      auto_upload: true,
      is_4k: updateData.is_4k,
      is_db: updateData.is_db,
    },
  });
}
export async function updateEpisodesWithKoreanDescriptions() {
  const episodes = await db.episode.findMany({
    where: {
      kr_description: false,
    },
    include: {
      season: true,
    },
  });

  for (let episode of episodes) {
    if (episode.season) {
      const episodeData = await getEpisodeDetail(
        episode.series_id,
        episode.season.number,
        episode.number
      );

      if (episodeData?.overview) {
        const updatedEpisode = await db.episode.update({
          data: episodeData,
          where: { id: +episodeData.id },
        });
        console.log(`Episode ${updatedEpisode.id}에 한국어 설명 추가됨.`);
      }
    }
  }
}

export async function updateSeasonsWithEpisodes() {
  const seasons = await db.season.findMany({
    where: {
      AND: {
        NOT: {
          nyaa_query: null,
        },
        auto_upload: true,
      },
    },
  });

  for (let season of seasons) {
    addEpisodes(season.id, season.nyaa_query!);
  }
}

export async function addEpisodes(seasonId: number, nyaaQuery: string) {
  try {
    const nyaaMagnets = await getNyaaMagnets(nyaaQuery);
    const magnets = await checkMagnetsExist(nyaaMagnets);

    const videoInfos = await Promise.all(
      magnets.map(async (magnetUrl) => {
        return await downloadVideoFileFormTorrent(magnetUrl);
      })
    );

    for (let videoInfo of videoInfos) {
      for (let info of videoInfo) {
        await upsertEpisode({
          episodeNumber: info.episodeNumber,
          magnetUrl: info.magnetUrl,
          seasonId: seasonId,
          videoId: info.videoId,
        });
      }
    }

    console.log("에피소드가 성공적으로 추가되었습니다.");
  } catch (error) {
    console.error(error);
  }
}
