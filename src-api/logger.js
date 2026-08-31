const isDev = process.env.NODE_ENV !== "production";

function timestamp() {
  return new Date().toISOString();
}

function formatMeta(meta) {
  if (!meta || Object.keys(meta).length === 0) return "";
  try {
    return " " + JSON.stringify(meta);
  } catch {
    return "";
  }
}

export const logger = {
  info(message, meta) {
    console.log(`[${timestamp()}] [INFO] ${message}${formatMeta(meta)}`);
  },
  warn(message, meta) {
    console.warn(`[${timestamp()}] [WARN] ${message}${formatMeta(meta)}`);
  },
  error(message, errorOrMeta, extraMeta) {
    let meta = extraMeta;
    let errStr = "";
    if (errorOrMeta instanceof Error) {
      errStr = ` | ${errorOrMeta.message}`;
      if (errorOrMeta.stack && isDev) {
        errStr += `\n${errorOrMeta.stack}`;
      }
    } else if (errorOrMeta) {
      meta = errorOrMeta;
    }
    console.error(`[${timestamp()}] [ERROR] ${message}${errStr}${formatMeta(meta)}`);
  },
  debug(message, meta) {
    if (isDev) {
      console.debug(`[${timestamp()}] [DEBUG] ${message}${formatMeta(meta)}`);
    }
  },
};
