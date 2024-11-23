import { Hono } from "hono";
import path from "path";
import { VIDEO_FOLDER_DIR } from "../lib/constants";
import { VideoStremInfoOption } from "../../types/interfaces";
import fs from "fs";
import { Readable } from "stream";
import { Router } from "express";

const videoRouter = Router();

/* // Node.js의 ReadableStream을 Web ReadableStream으로 변환하는 함수
function nodeToWebReadableStream(nodeReadable: Readable) {
  return new ReadableStream({
    start(controller) {
      nodeReadable.on("data", (chunk) => {
        controller.enqueue(chunk);
      });
      nodeReadable.on("end", () => {
        controller.close();
      });
      nodeReadable.on("error", (err) => {
        controller.error(err);
      });
    },
    cancel() {
      nodeReadable.destroy();
    },
  });
}
 */
videoRouter.get("/:id", async (req, res) => {
  const id = req.params.id; //or use req.param('id')

  const filePath = path.join(VIDEO_FOLDER_DIR, id);

  // Listing 3.
  const options: VideoStremInfoOption = {};

  let start: any;
  let end: any;

  const range = req.headers.range;
  if (range) {
    const bytesPrefix = "bytes=";
    if (range.startsWith(bytesPrefix)) {
      const bytesRange = range.substring(bytesPrefix.length);
      const parts = bytesRange.split("-");
      if (parts.length === 2) {
        const rangeStart = parts[0] && parts[0].trim();
        if (rangeStart && rangeStart.length > 0) {
          options.start = start = parseInt(rangeStart);
        }
        const rangeEnd = parts[1] && parts[1].trim();
        if (rangeEnd && rangeEnd.length > 0) {
          options.end = end = parseInt(rangeEnd);
        }
      }
    }
  }

  res.setHeader("content-type", "video/mp4");

  fs.stat(filePath, (err, stat) => {
    if (err) {
      console.error(`File stat error for ${filePath}.`);
      console.error(err);
      res.sendStatus(500);
      return;
    }

    let contentLength = stat.size;

    // Listing 4.
    if (req.method === "HEAD") {
      res.statusCode = 200;
      res.setHeader("accept-ranges", "bytes");
      res.setHeader("content-length", contentLength);
      res.end();
    } else {
      // Listing 5.
      let retrievedLength;
      if (start !== undefined && end !== undefined) {
        retrievedLength = end + 1 - start;
      } else if (start !== undefined) {
        retrievedLength = contentLength - start;
      } else if (end !== undefined) {
        retrievedLength = end + 1;
      } else {
        retrievedLength = contentLength;
      }

      // Listing 6.
      res.statusCode = start !== undefined || end !== undefined ? 206 : 200;

      res.setHeader("content-length", retrievedLength);

      if (range !== undefined) {
        res.setHeader(
          "content-range",
          `bytes ${start || 0}-${end || contentLength - 1}/${contentLength}`
        );
        res.setHeader("accept-ranges", "bytes");
      }

      // Listing 7.
      const fileStream = fs.createReadStream(filePath, options);
      fileStream.on("error", (error) => {
        console.log(`Error reading file ${filePath}.`);
        console.log(error);
        res.sendStatus(500);
      });
      // type script 탈출..
      fileStream.pipe(res as any);
    }
  });
});

export default videoRouter;
