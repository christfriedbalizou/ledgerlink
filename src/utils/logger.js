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
  if (shouldLog(level)) {
    const ts = new Date().toISOString();
    // Format: [LEVEL] [timestamp] message
    console.log(`[${level.toUpperCase()}] [${ts}]`, util.format(...args));
  }
}

export const logger = {
  error: (...args) => log("error", ...args),
  warn: (...args) => log("warn", ...args),
  info: (...args) => log("info", ...args),
  debug: (...args) => log("debug", ...args),
};
