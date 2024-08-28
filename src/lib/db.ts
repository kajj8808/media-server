import { Genres, PrismaClient } from "@prisma/client";
import { makeTMDBImageURL } from "./utils";
import { TMDBSeason } from "../../types/interfaces";

const db = new PrismaClient();
export async function getGenres({ id, name }: Genres) {
  const genresId = await db.genres.findUnique({
    where: {
      id,
    },
    select: { id: true },
  });
  if (genresId) {
    return genresId;
  } else {
    const newGenres = await db.genres.create({
      data: {
        id,
        name,
      },
      select: {
        id: true,
      },
    });
    return newGenres;
  }
}

export async function getSeason(season: TMDBSeason, seriesId: number) {
  const seasonId = await db.season.findUnique({
    where: { id: season.id },
    select: {
      id: true,
    },
  });
  if (seasonId) {
    return seasonId;
  } else {
    const newSeason = await db.season.create({
      data: {
        id: season.id,
        name: season.name,
        number: season.season_number,
        auto_upload: false,
        series_id: seriesId,
        air_date: new Date(season.air_date),
        poster: season.poster_path
          ? makeTMDBImageURL(season.poster_path)
          : null,
      },
      select: {
        id: true,
      },
    });
    return newSeason;
  }
}

export default db;
