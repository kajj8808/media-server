import { PrismaClient } from "@prisma/client";
import { createTmdbImageUrl, getEpisodeDetail, getSeries } from "./tmdb";
import type { Season, TMDBSeries } from "types/tmdb";
import { getNyaaMagnets } from "./web-scraper";
import { downloadVideoFileFormTorrent } from "./torrent";
import { convertPlaintextToCipherText, convertTmdbStatus } from "utils/lib";
import { sendAnimationMessage } from "./discord";

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
    id: +seriesId,
    title: series.name,
    overview: series.overview,
    backdrop_path: createTmdbImageUrl(series.backdrop_path),
    poster_path: createTmdbImageUrl(series.poster_path),
    status: convertTmdbStatus(series.status),
    genres: {
      connect: genres,
    },
  };

  return await db.series.upsert({
    create: seriesData,
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
        id: +season.id,
        series_id: +seriesId,
        season_number: +season.season_number,
        tmdb_season_number: +season.season_number,
        name: season.name,
        overview: season.overview,
        poster_path: createTmdbImageUrl(season.poster_path),
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
  watchId: string;
}

export async function upsertEpisode({
  seasonId,
  episodeNumber,
  magnetUrl,
  watchId,
}: UpsertEpisodeProps) {}

export async function checkMagnetsExist(magnets: string[]) {
  const magnetInfos = magnets.map((magnet) => ({
    cipherMagnet: convertPlaintextToCipherText(magnet),
    magnet,
  }));

  const existChecks = magnetInfos.map(async (magnetInfo) => {
    const exist = await db.magnet.findFirst({
      where: {
        chiper_link: magnetInfo.cipherMagnet,
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
  auto_upload: boolean;
}

export async function updateSeason(updateData: UpdateData) {
  const updatedSeason = await db.season.update({
    where: { id: +updateData.seasonId },
    data: {
      should_download: updateData.auto_upload,
      nyaa_query: updateData.nyaa_query,
    },
    include: {
      series: {
        select: {
          id: true,
        },
      },
    },
  });
  return updatedSeason;
}
export async function updateEpisodesWithKoreanDescriptions() {
  const episodes = await db.episode.findMany({
    where: {
      is_korean_translated: false,
    },
    include: {
      season: true,
    },
  });

  for (let episode of episodes) {
    if (episode.season) {
      const episodeDetail = await getEpisodeDetail(
        episode.series_id,
        episode.season.season_number,
        episode.episode_number
      );

      if (!episodeDetail) {
        continue;
      }

      if (episodeDetail.overview) {
        const updatedEpisode = await db.episode.update({
          data: {
            episode_number: episodeDetail.episode_number,
            name: episodeDetail.name,
            overview: episodeDetail.overview,
            still_path: createTmdbImageUrl(episodeDetail.still_path),
            runtime: episodeDetail.runtime,
            is_korean_translated: true,
          },
          where: { id: +episode.id },
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
        should_download: true,
      },
    },
    include: {
      series: true,
    },
  });
  for (let season of seasons) {
    handleEpisodeTorrents({
      seasonId: season.id,
      seasonNumber: season.season_number,
      seriesId: season.series?.id!,
      nyaaQuery: season.nyaa_query,
    });
  }
}

async function createNewMagnet(magnetUrl: string) {
  return await db.magnet.create({
    data: {
      chiper_link: convertPlaintextToCipherText(magnetUrl),
    },
  });
}

async function createNewVideoContent(videoId: string, newMagnet: any) {
  return await db.videoContent.create({
    data: {
      type: "EPISODE",
      watch_id: videoId,
      magnet: {
        connect: newMagnet,
      },
    },
  });
}

async function createNewEpisode(
  info: any,
  episodeDetail: any,
  seriesId: number,
  seasonId: number,
  newVideoContent: any
) {
  return await db.episode.create({
    data: {
      name: episodeDetail.name,
      overview: episodeDetail.overview,
      episode_number: +info.episodeNumber,
      video_content: {
        connect: newVideoContent,
      },
      series: {
        connect: {
          id: seriesId,
        },
      },
      season: {
        connect: {
          id: seasonId,
        },
      },
      still_path: createTmdbImageUrl(episodeDetail.still_path),
      is_korean_translated: episodeDetail.overview !== "",
      runtime: +episodeDetail.runtime,
    },
    include: {
      season: true,
      series: true,
    },
  });
}

async function fetchEpisodeDetail(
  seriesId: number,
  seasonNumber: number,
  episodeNumber: number
) {
  const episodeDetail = await getEpisodeDetail(
    seriesId,
    seasonNumber,
    episodeNumber
  );
  if (!episodeDetail) {
    console.error(
      `Episode Detail Error\nseries Id:${seriesId} season Id:${seasonNumber} episode number:${episodeNumber}`
    );
    return null;
  }
  return episodeDetail;
}

interface AddEpisodesProps {
  seasonId: number;
  seasonNumber: number;
  seriesId: number;
  nyaaQuery?: string | null;
  magnetUrl?: string | null;
}

export async function handleEpisodeTorrents({
  magnetUrl,
  nyaaQuery,
  seasonId,
  seasonNumber,
  seriesId,
}: AddEpisodesProps) {
  try {
    if (nyaaQuery) {
      const nyaaMagnets = await getNyaaMagnets(nyaaQuery);
      const magnets = await checkMagnetsExist(nyaaMagnets);

      magnets.forEach(async (magnetUrl) => {
        downloadVideoFileFormTorrent(magnetUrl).then((videoInfo) =>
          videoInfo.forEach(async (info) => {
            const episodeDetail = await fetchEpisodeDetail(
              seriesId,
              seasonNumber,
              info.episodeNumber
            );
            if (!episodeDetail) return;

            const newMagnet = await createNewMagnet(info.magnetUrl);
            const newVideoContent = await createNewVideoContent(
              info.videoId,
              newMagnet
            );
            const newEpisode = await createNewEpisode(
              info,
              episodeDetail,
              seriesId,
              seasonId,
              newVideoContent
            );

            await sendAnimationMessage({
              episodeName: newEpisode.name!,
              episodeNumber: newEpisode.episode_number,
              imageUrl: newEpisode.still_path!,
              seasonName: newEpisode.season?.name!,
              seriesName: newEpisode.series?.title!,
              watchId: newVideoContent.watch_id,
            });

            console.log(`${info.videoId} 비디오가 성공적으로 처리 되었습니다.`);
          })
        );
      });
    }
    if (magnetUrl) {
      downloadVideoFileFormTorrent(magnetUrl).then((videoInfo) =>
        videoInfo.forEach(async (info) => {
          const episodeDetail = await fetchEpisodeDetail(
            seriesId,
            seasonId,
            info.episodeNumber
          );
          if (!episodeDetail) return;

          const newMagnet = await createNewMagnet(info.magnetUrl);
          const newVideoContent = await createNewVideoContent(
            info.videoId,
            newMagnet
          );

          const newEpisode = await createNewEpisode(
            info,
            episodeDetail,
            seriesId,
            seasonId,
            newVideoContent
          );

          await sendAnimationMessage({
            episodeName: newEpisode.name!,
            episodeNumber: newEpisode.episode_number,
            imageUrl: newEpisode.still_path!,
            seasonName: newEpisode.season?.name!,
            seriesName: newEpisode.series?.title!,
            watchId: newVideoContent.watch_id,
          });
          console.log(`${info.videoId} 비디오가 성공적으로 처리 되었습니다.`);
        })
      );
    }
  } catch (error) {
    console.error(error);
  }
}

export async function addSubtitle(
  videoContentId: string,
  subtitleId: string | null
) {
  const videoContet = await db.videoContent.update({
    where: {
      id: +videoContentId,
    },
    data: {
      subtitle_id: subtitleId,
    },
  });
  return videoContet;
}
