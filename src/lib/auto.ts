import { getNyaaMagnets } from "../data/nyaa";
import crypto from "crypto";
import db from "./db";
import { torrentDownloadeHandler } from "./torrent";
import { sleep } from "./utils";

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
        torrentDownloadeHandler({
          magnet: magnet,
          seasonId: season.id,
          seriesId: season.series?.id!,
          tmdbId: season.series?.tmdb_id!,
          excludedEpisodeCount: season.excluded_episode_count,
        });
        // 20분
        await sleep(1 * 60 * 20);
      }
    }
  }
}
