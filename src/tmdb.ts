import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { sleep } from "./lib/utile";
import db from "./lib/db";
import { IDetail } from "../types/interface";

export async function autoInseartSeries() {
  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
    },
  };
  const autoSeriesList = await db.autoSeries.findMany();
  for (let autoSeries of autoSeriesList) {
    const url = `https://api.themoviedb.org/3/tv/${autoSeries.tmdbId}?language=ko-KR`;
    const json = await (await fetch(url, options)).json();
    const { name, overview, backdrop_path, poster_path, seasons } = json;
    let series;
    try {
      series = await db.series.create({
        data: {
          title: name,
          coverImage: "http://image.tmdb.org/t/p/original/" + backdrop_path,
          overview: overview,
          tmdbId: autoSeries.tmdbId,
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          series = await db.series.update({
            where: { title: name },
            data: {
              title: name,
              coverImage: "http://image.tmdb.org/t/p/original/" + backdrop_path,
              overview: overview,
              tmdbId: autoSeries.tmdbId,
              poster: poster_path,
            },
          });
        }
      }
    }
    try {
      for (let season of seasons) {
        await db.season.create({
          data: {
            id: season.id,
            name: season.name,
            seriesId: series?.id,
            number: season.season_number,
          },
        });
      }
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          await sleep(3);
          continue;
        }
        console.error(error);
      }
    }
    await sleep(3);
  }
}

export async function fetchEpisodeDetail(
  tmdbId: number,
  seasonNumber: number,
  episodeNumber: number
): Promise<IDetail> {
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
    console.error(url);
    throw error;
  }
}
