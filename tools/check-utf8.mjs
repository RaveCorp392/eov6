import { readFileSync } from "node:fs";
import { TextDecoder } from "node:util";

const buf = readFileSync("lib/firebase-admin.ts");
try {
  new TextDecoder("utf-8", { fatal: true }).decode(buf);
  console.log("OK: lib/firebase-admin.ts is valid UTF-8");
} catch (error) {
  console.error("BAD ENCODING: lib/firebase-admin.ts is not valid UTF-8");
  process.exit(1);
}