interface VttCaption {
  start: string;
  end: string;
  text: string;
}

// 0:02:50.47=> 00:02:50.470
function convertTime(assTime: string) {
  let [h, m, s] = assTime.split(":");
  let [seconds, centiseconds] = s.split(".");
  centiseconds = centiseconds.padEnd(3, "0");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:${seconds.padStart(
    2,
    "0"
  )}.${centiseconds}`;
}
function removeASSFormatting(text: string): string {
  return text.replace(/\{[^}]+\}/g, "");
}
/** ass content text를 vtt content text로 변환하는 함수 */
export function convertAssToVtt(assText: string) {
  const lines = assText.split("\n");
  const captions: VttCaption[] = [];
  let isEvents = false;

  for (const line of lines) {
    if (line.startsWith("[Events]")) {
      // events line은 밑의 라인 처리~
      isEvents = true;
      continue;
    }
    // text data line => Dialogue:
    if (isEvents && line.startsWith("Dialogue:")) {
      const parts = line.split(",");
      if (parts.length >= 10) {
        captions.push({
          start: parts[1].trim(), // 0:02:50.47 자막 시작 시간
          end: parts[2].trim(), // 0:02:54.16 자막 끝 시간
          text: parts.slice(9).join(",").trim().replace("\\N", "\n"), // 자막 text \r 등으로 끝남. + \\N 으로 인식이 안되게 되어 있는 부분이 있음.
        });
      }
    }
  }
  let vttText = "WEBVTT\n\n";
  captions.forEach((caption, index) => {
    vttText += `${convertTime(caption.start)} --> ${convertTime(
      caption.end
    )}\n`;
    vttText += `${removeASSFormatting(caption.text)}\n\n`;
  });
  return vttText;
}
