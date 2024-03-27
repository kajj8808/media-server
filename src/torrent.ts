import fs from "fs";
import WebTorrent from "webtorrent";
import crypto from "crypto";

const torrentClient = new WebTorrent();
const FILE_DIR = `${__dirname}/public/json/magnet_hash_list.json`;

export function downloadTorrentVideo(torrentId: string) {
  torrentClient.add(torrentId, (torrent) => {
    const file = torrent.files.find(
      (file) => file.name.endsWith(".mkv") || file.name.endsWith(".mp4")
    );
    if (!file) return;

    const filename = new Date().getTime();

    const source = file.createReadStream();
    const destination = fs.createWriteStream(
      `${__dirname}/public/video/${filename}`
    );
    source.pipe(destination).on("finish", () => {
      console.log(file.name);
    });
  });
}

function parseMagnetHashFile(): string[] {
  const readData = fs.readFileSync(FILE_DIR, { encoding: "utf-8" });
  const arrayData = JSON.parse(readData);
  return arrayData;
}

export function saveMagnet(magnet: string) {
  try {
    const hash = crypto.createHash("sha256").update(magnet).digest("base64");
    const prevList = parseMagnetHashFile();
    if (prevList.includes(hash)) return;
    fs.writeFileSync(FILE_DIR, JSON.stringify([...prevList, hash]));
  } catch (error) {
    console.error(error);
  }
}

export function checkMagnetExists(magnet: string) {
  try {
    const hash = crypto.createHash("sha256").update(magnet).digest("base64");
    const prevList = parseMagnetHashFile();
    if (prevList.includes(hash)) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error(error);
  }
}

/* downloadTorrentVideo(
  "magnet:?xt=urn:btih:32bf2b8245c4eb5782c3f22f574680eaa5c6da35&dn=%5BJudas%5D%20Sousou%20no%20Frieren%20%28Frieren%3A%20Beyond%20Journey%27s%20End%29%20-%20S01E27%20%5B1080p%5D%5BHEVC%20x265%2010bit%5D%5BMulti-Subs%5D%20%28Weekly%29&tr=http%3A%2F%2Fnyaa.tracker.wf%3A7777%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce"
);
downloadTorrentVideo(
  "magnet:?xt=urn:btih:b33100a0b655eeb5f4985d9bbd456c7a3d9f7b1e&dn=%5BErai-raws%5D%20Sousou%20no%20Frieren%20-%2027%20%5B1080p%5D%5BHEVC%5D%5BMultiple%20Subtitle%5D%20%5BENG%5D%5BPOR-BR%5D%5BSPA-LA%5D%5BSPA%5D%5BARA%5D%5BFRE%5D%5BGER%5D%5BITA%5D%5BRUS%5D&tr=http%3A%2F%2Fnyaa.tracker.wf%3A7777%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce"
);
downloadTorrentVideo(
  "magnet:?xt=urn:btih:119a2d5844d05e66fcaa8cf22bdb360e5806abc2&dn=%5BASW%5D%20Sousou%20no%20Frieren%20-%2027%20%5B1080p%20HEVC%20x265%2010Bit%5D%5BAAC%5D&tr=http%3A%2F%2Fnyaa.tracker.wf%3A7777%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce"
);
downloadTorrentVideo(
  "magnet:?xt=urn:btih:5b56b1135d4cfe8bee36170bc3ad403ee53bee71&dn=%5BEMBER%5D%20Sousou%20no%20Frieren%20S01E27%20%5B1080p%5D%20%5BHEVC%20WEBRip%5D%20%28Frieren%3A%20Beyond%20Journey%60s%20End%29&tr=http%3A%2F%2Fnyaa.tracker.wf%3A7777%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce"
);
downloadTorrentVideo(
  "magnet:?xt=urn:btih:baa9f9d5fc9d46e39fedf90c157540eb3a63cebe&dn=%5BKoi-Raws%5D%20Sousou%20no%20Frieren%20-%2027%20%E3%80%8C%E4%BA%BA%E9%96%93%E3%81%AE%E6%99%82%E4%BB%A3%E3%80%8D%20%28NTV%201920x1080%20x264%20AAC%29.mkv&tr=http%3A%2F%2Fnyaa.tracker.wf%3A7777%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce"
);
 */
