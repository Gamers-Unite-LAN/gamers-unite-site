import { isAuthorizedUploader } from "../utils.js";
import { logger } from "../logger.js";

export default function registerValidate(app) {
  app.get("/api/validate", (req, res) => {
    if (!isAuthorizedUploader(req)) {
      logger.warn("API key validation failed or missing key", { ip: req.socket.remoteAddress });
      res.status(401).json({ valid: false });
      return;
    }
    logger.info("API key validated successfully", { ip: req.socket.remoteAddress });
    res.json({ valid: true });
  });
}
