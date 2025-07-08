import { getUnmatchedVideoFiles } from "utils/lib";

export async function test() {
  const videoContents = [
    {
      watch_id: "1746917757770",
    },
    {
      watch_id: "1746917757772",
    },
  ];
  /* const videoContents = await db.videoContent.findMany({
    select: {
      watch_id: true,
    },
  }); */
  const unMatchedVideos = await getUnmatchedVideoFiles(videoContents);
  console.log(unMatchedVideos);
}
