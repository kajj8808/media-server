import fs from "fs";
import { IUploadInfo } from "../interfaces";
import path from "path";

export function readAutoList() {
  const filePath = path.join(__dirname, `../public/json/auto_list.json`);
  const readData = fs.readFileSync(filePath, { encoding: "utf-8" });
  const arrayData = JSON.parse(readData) as IUploadInfo[];
  return arrayData;
}
/** 같은 날인지 확인하는 함수입니다 시간은 포함하지 않습니다. */
export function isEqualDate(dateOne: Date, dateTwo: Date) {
  const dOne = new Date(
    dateOne.getFullYear(),
    dateOne.getMonth(),
    dateOne.getDate()
  ).getTime();
  const dTwo = new Date(
    dateTwo.getFullYear(),
    dateTwo.getMonth(),
    dateTwo.getDate()
  ).getTime();
  return dOne === dTwo;
}
/** 날짜가 넘었는지 확인하는 함수입니다. */
export function isAfterDate(dateOne: Date, dateTwo: Date) {
  const dOne = dateOne.getTime();
  const dTwo = dateTwo.getTime();
  return dOne > dTwo;
}
