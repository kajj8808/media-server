import { Series } from "../types/interfaces";

const BASE_URL = "https://api.themoviedb.org";

export async function getSeriesDetail(seriesId: number) {
  const url = `${BASE_URL}/3/tv/${seriesId}?language=ko-kr`;
  const options: RequestInit = {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
    },
  };
  const json = (await (await fetch(url, options)).json()) as Series;
  return json;
}

interface EpisodeDetailProps {
  seriesId: number;
  seasonNumber: number;
  episodeNumber: number;
}
export async function getEpisodeDetail({
  episodeNumber,
  seasonNumber,
  seriesId,
}: EpisodeDetailProps) {
  const url = `${BASE_URL}/3/tv/${seriesId}/season/${seasonNumber}/episode/${episodeNumber}?language=ko-kr`;
  const options: RequestInit = {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
    },
  };
  const json = (await (await fetch(url, options)).json()) as Series;
  return json;
}
/* 
    {
  air_date: '2024-08-10',
  crew: [],
  episode_number: 6,
  guest_stars: [],
  name: '에피소드 6',
  overview: '',
  id: 5514293,
  production_code: '',
  runtime: 26,
  season_number: 5,
  still_path: '/79OflUcFDMeKJowKulOkWL2jzYk.jpg',
  vote_average: 0,
  vote_count: 0
}
  db에 저장할떄 정보가 이렇게 있으면 일단 저장해 두고 kr data none 상태에서 계속 가져오게 설정
*/
/* getEpisodeDetail({
  seriesId: 46195,
  seasonNumber: 5,
  episodeNumber: 5,
}); */
