/** srt content text를 vtt content text로 변환하는 함수 */
export function convertSrtToVtt(subtitleText: string) {
  let vttText = "WEBVTT\n";
  console.log(subtitleText);
  vttText += subtitleText
    .replace(/\r/g, "")
    .replace(
      /^(\d{2}:\d{2}:\d{2}),(\d{3}) --> (\d{2}:\d{2}:\d{2}),(\d{3})/gm,
      "$1.$2 --> $3.$4"
    );

  return vttText;
}
