export function makeTMDBImageURL(tmdbImageId: string) {
  return `https://image.tmdb.org/t/p/original/${tmdbImageId}`;
}
/** sleep ( second ) */
export async function sleep(second: number) {
  return new Promise((resolve) => setTimeout(resolve, second * 1000));
}
