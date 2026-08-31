export default function registerHealth(app) {
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });
}
