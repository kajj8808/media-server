import { PrismaClient } from "@prisma/client";
import { createTmdbImageUrl, getEpisodeDetail, getSeries } from "./tmdb";
import type { Season, TMDBSeries } from "types/tmdb";
import { getNyaaMagnets } from "./web-scraper";
import { downloadVideoFileFormTorrent } from "./torrent";
import { convertPlaintextToCipherText, convertTmdbStatus } from "utils/lib";

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
    id: seriesId,
    title: series.name,
    overview: series.overview,
    backdrop_path: series.backdrop_path,
    poster_path: series.poster_path,
    status: convertTmdbStatus(series.status),
    genres: {
      connect: genres,
    },
  };

  return await db.series.upsert({
    create: seriesData,
    update: seriesData,
    where: {
      id: seriesId,
    },
  });
}

export async function upsertSeasons(seriesId: number, seasons: Season[]) {
  return await Promise.all(
    seasons.map((season) => {
      const seasonData = {
        id: +season.id,
        series_id: seriesId,
        season_number: season.season_number,
        name: season.name,
        overview: season.overview,
        poster_path: season.poster_path,
        air_date: new Date(season.air_date),
      };
      return db.season.upsert({
        create: {
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
    const season = await db.season.findUnique({
      where: { id: +seasonId },
      select: {
        id: true,
        number: true,
        series: { select: { id: true } },
        excluded_episode_count: true,
      },
    });
    if (!season) return;

    const episodeDetail = await getEpisodeDetail(
      season.series.id,
      season.number,
      season.excluded_episode_count
        ? season.excluded_episode_count + episodeNumber
        : episodeNumber
    );

    if (!episodeDetail) return;

    const cipherMagnet = convertPlaintextToCipherText(magnetUrl);

    const episodeData = {
      id: +episodeDetail.id,
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

    let updatedEpisode;
    try {
      const newMagnet = await db.magnet.create({
        data: {
          cipher_magnet: cipherMagnet,
        },
      });

      if (newMagnet && newMagnet.id) {
        updatedEpisode = await db.episode.upsert({
          create: {
            ...episodeData,
            magnet_id: newMagnet.id,
          },
          update: {
            ...episodeData,
            magnet_id: newMagnet.id,
          },
          where: { id: +episodeDetail.id },
        });
      }
    } catch (error) {
      // pass
      updatedEpisode = await db.episode.upsert({
        create: episodeData,
        update: episodeData,
        where: { id: +episodeDetail.id },
      });
    }

    return updatedEpisode;
  } catch (error) {
    console.error(`upsertEpisode error: ${error}`);
  }
}

export async function checkMagnetsExist(magnets: string[]) {
  const magnetInfos = magnets.map((magnet) => ({
    cipherMagnet: convertPlaintextToCipherText(magnet),
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
  nyaa_query?: string;
  magnet_url?: string;
  auto_upload: boolean;
  is_4k: boolean;
  is_db: boolean;
}

export async function updateSeason(updateData: UpdateData) {
  const newData = {
    auto_upload: true,
    is_4k: updateData.is_4k,
    is_db: updateData.is_db,
    nyaa_query: updateData.nyaa_query,
  };

  const updatedData = await db.season.update({
    where: { id: +updateData.seasonId },
    data: newData,
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
      const episodeDetail = await getEpisodeDetail(
        episode.series_id,
        episode.season.number,
        episode.number
      );

      if (!episodeDetail) {
        continue;
      }

      const episodeData = {
        id: +episodeDetail.id,
        number: episodeDetail.episode_number,
        season_id: +episode.season.id,
        series_id: +episode.series_id,
        title: episodeDetail.name,
        description: episodeDetail.overview,
        kr_description: episodeDetail.overview !== "",
        thumbnail: createTmdbImageUrl(episodeDetail.still_path),
        running_time: episodeDetail.runtime,
      };

      if (episodeData?.description) {
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
    addEpisodes({
      seasonId: season.id,
      nyaaQuery: season.nyaa_query,
    });
  }
}

interface AddEpisodesProps {
  seasonId: number;
  nyaaQuery?: string | null;
  magnetUrl?: string | null;
}
export async function addEpisodes({
  magnetUrl,
  nyaaQuery,
  seasonId,
}: AddEpisodesProps) {
  try {
    if (nyaaQuery) {
      const nyaaMagnets = await getNyaaMagnets(nyaaQuery);
      const magnets = await checkMagnetsExist(nyaaMagnets);

      magnets.forEach(async (magnetUrl) => {
        downloadVideoFileFormTorrent(magnetUrl).then((videoInfo) =>
          videoInfo.forEach(async (info) => {
            await upsertEpisode({
              episodeNumber: info.episodeNumber,
              magnetUrl: info.magnetUrl,
              seasonId: seasonId,
              videoId: info.videoId,
            });
            console.log(`${info.videoId} 비디오가 성공적으로 처리 되었습니다.`);
          })
        );
      });
    }
    if (magnetUrl) {
      downloadVideoFileFormTorrent(magnetUrl).then((videoInfo) =>
        videoInfo.forEach(async (info) => {
          await upsertEpisode({
            episodeNumber: info.episodeNumber,
            magnetUrl: info.magnetUrl,
            seasonId: seasonId,
            videoId: info.videoId,
          });
          console.log(`${info.videoId} 비디오가 성공적으로 처리 되었습니다.`);
        })
      );
    }
  } catch (error) {
    console.error(error);
  }
}
