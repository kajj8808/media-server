import db from "@services/database";
import { getUnmatchedSubtitleFiles, getUnmatchedVideoFiles } from "utils/lib";

export async function testUnmatchedVideoFiles() {
  /* const videoContents = await db.videoContent.findMany({
    select: {
      watch_id: true,
    },
  }); */
  const videoContents = [
    {
      watch_id: "1746917757770",
    },
    {
      watch_id: "1746917757772",
    },
  ];
  const unMatchedVideos = await getUnmatchedVideoFiles(videoContents);
  console.log(unMatchedVideos);
}

export async function testUnmatchedSubtitleFiles() {
  /* const videoContents = await db.videoContent.findMany({
    select: {
      subtitle_id: true,
    },
  }); */
  const videoContents = [{ subtitle_id: "1746940849814" }];
  const umMatchedSubtitles = await getUnmatchedSubtitleFiles(videoContents);
  console.log(umMatchedSubtitles);
}
