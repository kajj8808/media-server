import { PrismaClient } from "@prisma/client";
import { getSeries } from "./tmdb";
import type { Season, TMDBSeries } from "types/tmdb";

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
    cover_image: series.backdrop_path,
    overview: series.overview,
    genres: {
      connect: genres,
    },
    poster: series.poster_path,
    homepage: series.homepage,
    next_episode_to_air: series.next_episode_to_air
      ? new Date(series.next_episode_to_air.air_date)
      : null,
  };

  return await db.series.upsert({
    create: {
      ...seriesData,
      id: seriesId,
    },
    update: seriesData,
    where: {
      id: seriesId,
    },
  });
}

export async function upsertSeasons(seasons: Season[], seriesId: number) {
  return await Promise.all(
    seasons.map((season) => {
      const seasonData = {
        name: season.name,
        number: season.season_number,
        air_date: new Date(season.air_date),
        series_id: seriesId,
        poster: season.poster_path,
      };
      return db.season.upsert({
        create: {
          id: season.id,
          ...seasonData,
        },
        update: {
          ...seasonData,
        },
        where: { id: season.id },
      });
    })
  );
}
