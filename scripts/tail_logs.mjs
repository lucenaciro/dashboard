#!/usr/bin/env node
import { getCurrentLogFile } from "../src/shared/logger";
import fs from "node:fs";
import { promises as fsp } from "node:fs";

let active = getCurrentLogFile();
let position = 0;

console.log(`Tailing ${active}`);

async function pump() {
  const next = getCurrentLogFile();
  if (next !== active) {
    active = next;
    position = 0;
    console.log(`\nSwitched to ${active}`);
  }

  try {
    const stats = await fsp.stat(active);
    if (stats.size < position) {
      position = 0;
    }
    if (stats.size > position) {
      await new Promise<void>((resolve, reject) => {
        const stream = fs.createReadStream(active, {
          encoding: "utf8",
          start: position,
        });
        stream.on("data", chunk => {
          position += Buffer.byteLength(chunk);
          process.stdout.write(chunk);
        });
        stream.on("error", reject);
        stream.on("end", () => resolve());
      });
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("tail_logs error", error);
    }
  }
}

setInterval(() => {
  void pump();
}, 1000);

void pump();
