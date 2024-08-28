import { TMDB_API_KEY, TMDB_API_URL } from "../lib/constants";
import { TMDBDetail, TMDBSeries } from "../../types/interfaces";
import db from "../lib/db";

export async function getSeries(seriesId: string) {
  const options: RequestInit = {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${TMDB_API_KEY}`,
    },
  };

  const series = (await (
    await fetch(`${TMDB_API_URL}/tv/${seriesId}?language=ko-KR`, options)
  ).json()) as TMDBSeries;

  return series;
}

export async function getEpisodeDetail(
  seasonId: number,
  episodeNumber: number
): Promise<TMDBDetail> {
  const season = await db.season.findUnique({
    where: {
      id: seasonId,
    },
    select: {
      series: {
        select: {
          tmdb_id: true,
        },
      },
      number: true,
      excluded_episode_count: true,
    },
  });

  const url = `https://api.themoviedb.org/3/tv/${
    season?.series?.tmdb_id
  }/season/${season?.number}/episode/${
    season?.excluded_episode_count
      ? episodeNumber + season.excluded_episode_count
      : episodeNumber
  }?language=ko-KR`;
  console.log(url);
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

// getSeries("122");
