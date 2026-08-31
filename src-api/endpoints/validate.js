import { isAuthorizedUploader } from "../utils.js";

export default function registerValidate(app) {
  app.get("/api/validate", (req, res) => {
    if (!isAuthorizedUploader(req)) {
      res.status(401).json({ valid: false });
      return;
    }
    res.json({ valid: true });
  });
}
