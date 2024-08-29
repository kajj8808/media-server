import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();

export const TMDB_API_KEY = process.env.TMDB_API_KEY;
export const TMDB_API_URL = "https://api.themoviedb.org/3/";

export const DIR_NAME = fileURLToPath(new URL(".", import.meta.url));
export const __filename = fileURLToPath(import.meta.url);

export const VIDEO_FOLDER_DIR = path.join(DIR_NAME, "../../public", "video");

export const FRONT_URL = process.env.FRONT_URL || "";

export const PORT = 8443;
