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

    const magnets = await getNyaaMagnets(item.nyaaQuery);
    magnets.forEach(async (magnet) => {
      if (checkMagnetExists(magnet)) return;
      torrentDownloadHandler({
        torrentId: magnet,
        tmdbId: item.tmdbId,
        seasonId: +item.seasonId,
        seasonNumber: item.seasonNumber,
        seriesId: +item.seriesId,
      });
      /* 다운이 완료 되지 않아도 중복 추가를 막기위해 마그넷 저장 */
      saveMagnet(magnet);
    });
  });
}

export function startSchduleJob() {
  autoAnimationDownload();
  // 스케줄링된 작업을 저장할 객체 선언 typescript 환경이므로..
  let scheduledJobs: { [jobName: string]: schedule.Job } = {};

  // 매 시간마다 실행되는 스케줄 설정
  scheduledJobs["hourlyJob"] = schedule.scheduleJob("0 * * * *", () => {
    autoAnimationDownload();
  });
}
