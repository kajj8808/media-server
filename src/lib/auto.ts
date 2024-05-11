/** auto process를 당담하는 함수들  */

import crypto from "crypto";

import db from "./db";
import { getNyaaMagnets } from "./nyaa";
import { torrentDownloadeHandler } from "./torrent";
import { autoInseartSeries } from "../tmdb";
import { sleep } from "./utile";

async function videoAutoDownloader() {
  const autoSeason = await db.season.findMany({
    where: {
      autoUpload: true,
    },
    select: {
      id: true,
      nyaaQuery: true,
      number: true,
      series: {
        select: {
          id: true,
          tmdbId: true,
        },
      },
    },
  });

  for (let season of autoSeason) {
    if (!season.nyaaQuery) continue;
    const nyaaMagnets = await getNyaaMagnets(season.nyaaQuery);
    for (let magnet of nyaaMagnets) {
      const hash = crypto.createHash("md5").update(magnet).digest("base64");
      const isDownloaded = Boolean(
        await db.downloadedMagnet.findUnique({ where: { cipherMagnet: hash } })
      );
      if (!isDownloaded) {
        torrentDownloadeHandler({
          tmdbId: season.series?.tmdbId!,
          seriesId: season.series?.id!,
          seasonId: season.id,
          seasonNumber: season.number,
          torrentId: magnet,
        });
        await sleep(1800);
      }
    }
  }
}
autoInseartSeries();
videoAutoDownloader();
