import "dotenv/config";
import util from "util";

const LOG_LEVEL = process.env.LOG_LEVEL || "debug";
const levels = ["error", "warn", "info", "debug"];

function shouldLog(level) {
  const currentIdx = levels.indexOf(LOG_LEVEL);
  const levelIdx = levels.indexOf(level);
  return levelIdx <= currentIdx;
}

function log(level, ...args) {
  if (!shouldLog(level)) return;
  const ts = new Date().toISOString();
  const prefix = `[${level.toUpperCase()}] [${ts}]`;
  if (level === "error") {
    console.error(prefix, util.format(...args));
  } else if (level === "warn") {
    console.warn(prefix, util.format(...args));
  } else {
    console.warn(prefix, util.format(...args));
  }
}

export const logger = {
  error: (...args) => log("error", ...args),
  warn: (...args) => log("warn", ...args),
  info: (...args) => log("info", ...args),
  debug: (...args) => log("debug", ...args),
};
