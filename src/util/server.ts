import fs from "fs";
import { IUploadInfo } from "../interfaces";
import path from "path";

export function readAutoList() {
  const filePath = path.join(__dirname, `../public/json/auto_list.json`);
  const readData = fs.readFileSync(filePath, { encoding: "utf-8" });
  const arrayData = JSON.parse(readData) as IUploadInfo[];
  return arrayData;
}
