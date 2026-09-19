export default function registerAuth(app, { auth }) {
  app.get("/auth/discord", (req, res) => {
    auth.startLogin(req, res);
  });

  app.get("/auth/discord/callback", async (req, res) => {
    await auth.finishLogin(req, res);
  });

  app.get("/auth/me", (req, res) => {
    const user = auth.getUser(req);
    if (!user) {
      res.json({ authenticated: false, admin: false, user: null });
      return;
    }
    res.json({
      authenticated: true,
      admin: auth.isAdmin(req),
      user: {
        id: user.discordId,
        username: user.username,
        globalName: user.globalName,
        avatar: user.avatar,
      },
    });
  });

  app.post("/auth/logout", (req, res) => {
    auth.clearSession(req, res);
    res.status(204).end();
  });
}
