const PREFIX = "[FormatX]";
const STYLE = "color: #6366f1; font-weight: 700; font-size: 13px;";
const ERROR_STYLE = "color: #ef4444; font-weight: 700; font-size: 13px;";
const WARN_STYLE = "color: #f59e0b; font-weight: 600; font-size: 12px;";

export const logger = {
  log(...args: unknown[]) {
    console.log(`%c${PREFIX}`, STYLE, ...args);
  },
  warn(...args: unknown[]) {
    console.warn(`%c${PREFIX} [WARN]`, WARN_STYLE, ...args);
  },
  error(...args: unknown[]) {
    console.error(`%c${PREFIX} [ERROR]`, ERROR_STYLE, ...args);
  },
};
