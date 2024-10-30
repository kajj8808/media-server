import { getNyaaMagnets } from "../data/nyaa";
import crypto from "crypto";
import db from "./db";
import { episodeDownloadeHandler } from "./torrent";
import { sleep } from "./utils";
import { getEpisodeDetail } from "../data/tmdb";

export async function animationAutoDownload() {
  const autoSeasons = await db.season.findMany({
    where: {
      auto_upload: true,
    },
    select: {
      id: true,
      nyaa_query: true,
      number: true,
      series: {
        select: {
          id: true,
          tmdb_id: true,
        },
      },
      excluded_episode_count: true,
    },
  });
  for (let season of autoSeasons) {
    if (!season.nyaa_query) continue;
    const nyaaMagnets = await getNyaaMagnets(season.nyaa_query);
    for (let magnet of nyaaMagnets) {
      const hashedMagnet = crypto
        .createHash("md5")
        .update(magnet)
        .digest("base64");
      const isDownloaded = Boolean(
        await db.downloadedMagnet.findUnique({
          where: { cipher_magnet: hashedMagnet },
          select: {
            id: true,
          },
        })
      );
      if (!isDownloaded) {
        episodeDownloadeHandler({
          magnet: magnet,
          seasonId: `${season.id}`,
          seriesId: `${season.series?.id}`,
        });
        // 5분
        await sleep(1 * 60 * 5);
      }
    }
  }
}

/** Description + title 이 한국어로 되어 있지 않은 경우를 자동으로 수정하는 함수. */
export async function animationKorDescriptionAutoUpdate() {
  const episodes = await db.episode.findMany({
    where: {
      kr_description: false,
    },
    select: {
      id: true,
      season_id: true,
      number: true,
    },
  });
  for (let episode of episodes) {
    const tmdbEpisode = await getEpisodeDetail(
      episode.season_id,
      episode.number
    );

    if (tmdbEpisode.status_code === 34 || tmdbEpisode.overview === "") {
      continue;
    } else {
      await db.episode.update({
        where: {
          id: episode.id,
        },
        data: {
          title: tmdbEpisode.name,
          description: tmdbEpisode.overview,
        },
      });
    }
  }
}
