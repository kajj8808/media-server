interface Genre {
  id: number;
  name: string;
}

interface NextEpisodeToAir {
  id: number;
  name: string;
  overview: string;
  vote_average: number;
  vote_count: number;
  air_date: string;
  episode_number: number;
  episode_type: string;
  production_code: string;
  runtime: number | null;
  season_number: number;
  show_id: number;
  still_path: string | null;
}

export interface TMDBSeason {
  air_date: Date;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  vote_average: number;
}

interface ProductionCompany {
  id: number;
  logo_path: string;
  name: string;
  origin_country: string;
}

export interface TMDBSeries {
  backdrop_path: string;
  first_air_date: string;
  genres: Genre[];
  homepage: string;
  id: number;
  last_air_date: string;
  name: string;
  next_episode_to_air: NextEpisodeToAir;
  original_name: string;
  overview: string;
  poster_path: string;
  seasons: TMDBSeason[];
  production_companies: ProductionCompany[];
}
export interface TMDBDetail {
  air_date: string;
  crew: Crew[];
  episode_number: number;
  guest_stars: any[];
  name: string;
  overview: string;
  id: number;
  production_code: string;
  runtime: number;
  season_number: number;
  still_path: string;
  vote_average: number;
  vote_count: number;
  status_code?: number;
  series_name: string;
}
interface Crew {
  job: string;
  department: string;
  credit_id: string;
  adult: boolean;
  gender: number;
  id: number;
  known_for_department: string;
  name: string;
  original_name: string;
  popularity: number;
  profile_path?: string;
}
export interface VideoStremInfoOption {
  start?: number;
  end?: number;
}
export interface VttCaption {
  start: string;
  end: string;
  text: string;
}

export interface EpisodeData {
  title: string;
  description: string;
  running_time: number;
  thumnail: string;
  video_id: string;
  season_id: number;
  series_id: number;
  number: number;
  kr_description: boolean;
}

export interface TMDBMovieDetail {
  adult: boolean;
  backdrop_path: string;
  belongs_to_collection: {
    id: number;
    name: string;
    poster_path: string;
    backdrop_path: string;
  } | null;
  budget: number;
  genres: { id: number; name: string }[];
  homepage: string;
  id: number;
  imdb_id: string;
  origin_country: string[];
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string;
  production_companies: {
    id: number;
    logo_path: string | null;
    name: string;
    origin_country: string;
  }[];
  production_countries: { iso_3166_1: string; name: string }[];
  release_date: string;
  revenue: number;
  runtime: number;
  spoken_languages: { english_name: string; iso_639_1: string; name: string }[];
  status: string;
  tagline: string;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
}
