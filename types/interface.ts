export interface VideoStremInfoOption {
  start?: number;
  end?: number;
}

export interface IUploadInfo {
  nyaaQuery: string;
  tmdbId: string;
  seasonId: number;
  seriesId: number;
  endDate: string;
  anissiaId: string;
  seasonNumber: number;
}
export interface IDetail {
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
