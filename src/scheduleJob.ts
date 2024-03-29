import schedule from "node-schedule";
import {
  checkMagnetExists,
  saveMagnet,
  torrentDownloadHandler,
} from "./torrent";
import { isAfterDate, readAutoList } from "./util/server";
import { getNyaaMagnets } from "./nyaa";

export function autoAnimationDownload() {
  const autoList = readAutoList();

  autoList.forEach(async (item) => {
    const nowDate = new Date();
    const endDate = new Date(item.endDate);

    if (isAfterDate(nowDate, endDate)) return;
    console.log("안넘었으니까 작업할게!");

    const magnets = await getNyaaMagnets(item.nyaaQuery);
    magnets.slice(0, 1).forEach(async (magnet) => {
      if (checkMagnetExists(magnet)) return;
      torrentDownloadHandler({
        torrentId: magnet,
        tmdbId: item.tmdbId,
        seasonId: +item.seasonId,
        seasonNumber: item.seasonNumber,
        seriesId: +item.seriesId,
      });
      saveMagnet(magnet);
    });
  });
}

export function startSchduleJob() {
  // 스케줄링된 작업을 저장할 객체 선언 typescript 환경이므로..
  let scheduledJobs: { [jobName: string]: schedule.Job } = {};

  // 매 시간마다 실행되는 스케줄 설정
  scheduledJobs["hourlyJob"] = schedule.scheduleJob("0 * * * *", () => {
    autoAnimationDownload();
  });
}
