import type {
  TMDBEpisodeDetail,
  TMDBMovieDetail,
  TMDBSeries,
} from "types/tmdb";

import dotenv from "dotenv";
dotenv.config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = "https://api.themoviedb.org/3/";

const options: RequestInit = {
  method: "GET",
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${TMDB_API_KEY}`,
  },
};

export async function getSeries(seriesId: number) {
  const response = await fetch(
    `${TMDB_API_URL}/tv/${seriesId}?language=ko-KR`,
    options
  );
  if (response.ok) {
    const json = (await response.json()) as TMDBSeries;
    return json;
  }
}

export async function getEpisodeDetail(
  seriesId: number,
  seasonNumber: number,
  episodeNumber: number
) {
  const response = await fetch(
    `${TMDB_API_URL}/tv/${seriesId}/season/${seasonNumber}/episode/${episodeNumber}?language=ko-KR`,
    options
  );

  if (response.ok) {
    const json = (await response.json()) as TMDBEpisodeDetail;
    return json;
  }
}

export async function getMovieDetail(movieId: number) {
  const response = await fetch(
    `${TMDB_API_URL}/movie/${movieId}?language=ko-KR`
  );
  if (response.ok) {
    const json = (await response.json()) as TMDBMovieDetail;
    return json;
  }
}

export function createTmdbImageUrl(path: string) {
  const baseUrl = "https://image.tmdb.org/t/p/original";
  return `${baseUrl}${path}`;
}
