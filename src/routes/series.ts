import { Router } from "express";
import { getSeries } from "../data/tmdb";
import db, { getGenres, getSeason } from "../lib/db";
import { makeTMDBImageURL } from "../lib/utils";

const seriesRouter = Router();
seriesRouter.post("/insert", async (req, res) => {
  try {
    const tmdbId = req.body.tmdb_id as string;

    const tmdbSeries = await getSeries(tmdbId);
    const series = await db.series.upsert({
      where: {
        tmdb_id: tmdbSeries.id,
      },
      create: {
        title: tmdbSeries.name,
        overview: tmdbSeries.overview,
        cover_image: makeTMDBImageURL(tmdbSeries.backdrop_path),
        poster: makeTMDBImageURL(tmdbSeries.poster_path),
        tmdb_id: tmdbSeries.id,
        homepage: tmdbSeries.homepage,
        original_name: tmdbSeries.original_name,
        first_air_date: tmdbSeries.first_air_date,
        next_episode_to_air: tmdbSeries.next_episode_to_air
          ? new Date(tmdbSeries.next_episode_to_air.air_date)
          : null,
      },
      update: {
        homepage: tmdbSeries.homepage,
        next_episode_to_air: tmdbSeries.next_episode_to_air
          ? new Date(tmdbSeries.next_episode_to_air.air_date)
          : null,
      },
    });
    const genresList = await Promise.all(
      tmdbSeries.genres.map((genre) => getGenres(genre))
    );
    const seasonList = await Promise.all(
      tmdbSeries.seasons.map((season) => getSeason(season, series.id))
    );
    const updatedSeries = await db.series.update({
      where: {
        id: series.id,
      },
      data: {
        seasons: {
          connect: seasonList,
        },
        genres: {
          connect: genresList,
        },
      },
      select: {
        id: true,
      },
    });
    return res.json({ ok: true, seriesId: updatedSeries });
  } catch (error) {
    return res.json({ ok: false, error });
  }
});

export default seriesRouter;
