import fs from "fs";

const privateKey = fs.readFileSync(`${__dirname}/keys/private.key`, "utf-8");
const certificate = fs.readFileSync(
  `${__dirname}/keys/certificate.crt`,
  "utf-8"
);
const caBundle = fs.readFileSync(`${__dirname}/keys/ca_bundle.crt`, "utf-8");

export const credentials = {
  key: privateKey,
  cert: certificate,
  ca: caBundle,
};
