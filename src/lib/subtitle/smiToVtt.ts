import { Parser } from "htmlparser2";
import { VttCaption } from "../../../types/interfaces";

function generateVttTime(time: number) {
  return new Date(time * 1).toISOString().slice(11, -1);
}
/** smi content text를 vtt content text로 변환하는 함수 */
export function convertSmiToVtt(subtitleText: string) {
  let vttText = "WEBVTT\n";
  let type: null | string = null;
  // 한줄 한줄에 대한 데이터
  let caption: VttCaption = {
    start: "",
    end: "",
    text: "",
  };

  const parser = new Parser(
    {
      // html 형식으로 되어있는 smi의 tag가 열릴경우
      onopentag: (name, attribs) => {
        switch (name) {
          // comment (파일 이름 등에 대한 데이터가 있음..)
          case "title":
            type = "comment";
            vttText += "\nNOTE\n";
            break;
          // text (자막 내용)
          case "sync":
            type = "caption";
            // start (자막이 시작되는 시간)
            if (!caption.text) {
              caption.start = generateVttTime(+attribs.start);
            }
            // end (자막이 사라지는 시간)
            else {
              const time = generateVttTime(+attribs.start);
              caption.end = time;
              vttText += `${caption.start} --> ${caption.end}\n`;
              vttText += `${caption.text}\n\n`;

              /// vtt text를 더해준 후 초기화
              caption.start = time;
              caption.text = "";
            }
            break;
          // br (줄바꿈)
          case "br":
            caption.text += "\n";
            break;
        }
      },
      // html 형식으로 되어있는 smi의 tag가 닫힐경우
      onclosetag: (text) => {
        switch (type) {
          case "comment":
            vttText += text; // comment 추가
            vttText += "\n\n";
            type = null;
            break;
        }
      },
      // 그냥 text 로 있는 경우 -> 자막 text
      ontext: (text) => {
        switch (type) {
          case "comment":
            vttText += text.trim();
            break;
          case "caption":
            caption.text += text.trim();
            break;
        }
      },
    },
    { decodeEntities: true }
  );
  parser.write(subtitleText);
  parser.end();
  return vttText;
}
