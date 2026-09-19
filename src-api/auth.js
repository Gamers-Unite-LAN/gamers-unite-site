import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const SESSION_COOKIE = "gul_session";
const OAUTH_STATE_COOKIE = "gul_discord_state";
const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
const OAUTH_STATE_TTL_SECONDS = 10 * 60;

function sessionTtlMs() {
  const configured = Number(process.env.SESSION_TTL_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_SESSION_TTL_MS;
}

function discordConfig() {
  return {
    clientId: process.env.DISCORD_CLIENT_ID || "",
    clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
    redirectUri: process.env.DISCORD_REDIRECT_URI || "",
  };
}

function adminIds() {
  return new Set(
    (process.env.DISCORD_ADMIN_USER_IDS || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function getCookie(request, name) {
  const cookies = request.headers.cookie || "";
  for (const part of cookies.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    if (key === name) return decodeURIComponent(part.slice(separator + 1));
  }
  return "";
}

function cookie(name, value, maxAge) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

function clearCookie(name) {
  return cookie(name, "", 0);
}

function redirectTarget(path) {
  const configured = process.env.DISCORD_FRONTEND_URL;
  if (configured) return new URL(path, configured).href;
  const redirectUri = discordConfig().redirectUri;
  return redirectUri ? new URL(path, redirectUri).href : path;
}

function userFromDiscord(user) {
  if (!user || typeof user.id !== "string" || !user.id) {
    throw new Error("Discord returned an invalid user.");
  }
  return {
    discordId: user.id,
    username: typeof user.username === "string" ? user.username : "Discord user",
    globalName: typeof user.global_name === "string" ? user.global_name : null,
    avatar: typeof user.avatar === "string" ? user.avatar : null,
  };
}

export function createAuth(db) {
  const findSession = db.prepare(`
    SELECT sessions.discord_id AS discordId, users.username, users.global_name AS globalName, users.avatar
    FROM sessions
    JOIN users ON users.discord_id = sessions.discord_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `);
  const deleteSession = db.prepare("DELETE FROM sessions WHERE token_hash = ?");
  const deleteExpiredSessions = db.prepare("DELETE FROM sessions WHERE expires_at <= ?");
  const saveUser = db.prepare(`
    INSERT INTO users (discord_id, username, global_name, avatar)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(discord_id) DO UPDATE SET
      username = excluded.username,
      global_name = excluded.global_name,
      avatar = excluded.avatar,
      updated_at = CURRENT_TIMESTAMP
  `);
  const saveSession = db.prepare(
    "INSERT INTO sessions (token_hash, discord_id, expires_at) VALUES (?, ?, ?)",
  );

  function getSession(request) {
    const token = getCookie(request, SESSION_COOKIE);
    if (!token) return null;
    const session = findSession.get(hashToken(token), Date.now());
    if (!session) deleteSession.run(hashToken(token));
    return session || null;
  }

  function isConfigured() {
    const { clientId, clientSecret, redirectUri } = discordConfig();
    return Boolean(clientId && clientSecret && redirectUri);
  }

  function createSession(discordUser) {
    const user = userFromDiscord(discordUser);
    const token = randomBytes(32).toString("base64url");
    deleteExpiredSessions.run(Date.now());
    saveUser.run(user.discordId, user.username, user.globalName, user.avatar);
    saveSession.run(hashToken(token), user.discordId, Date.now() + sessionTtlMs());
    return { token, user, isAdmin: adminIds().has(user.discordId) };
  }

  function setSession(response, token) {
    response.append("Set-Cookie", cookie(SESSION_COOKIE, token, Math.floor(sessionTtlMs() / 1_000)));
  }

  function clearSession(request, response) {
    const token = getCookie(request, SESSION_COOKIE);
    if (token) deleteSession.run(hashToken(token));
    response.append("Set-Cookie", clearCookie(SESSION_COOKIE));
  }

  async function exchangeCode(code) {
    const { clientId, clientSecret, redirectUri } = discordConfig();
    const tokenResponse = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenResponse.ok) throw new Error(`Discord token exchange failed (${tokenResponse.status}).`);
    const token = await tokenResponse.json();
    if (typeof token.access_token !== "string" || !token.access_token) {
      throw new Error("Discord did not return an access token.");
    }

    const userResponse = await fetch(`${DISCORD_API_BASE}/users/@me`, {
      headers: { authorization: `Bearer ${token.access_token}` },
    });
    if (!userResponse.ok) throw new Error(`Discord user lookup failed (${userResponse.status}).`);
    return userResponse.json();
  }

  function startLogin(response) {
    if (!isConfigured()) {
      response.status(503).json({ error: "Discord login is not configured." });
      return;
    }
    const { clientId, redirectUri } = discordConfig();
    const state = randomBytes(32).toString("base64url");
    response.append("Set-Cookie", cookie(OAUTH_STATE_COOKIE, state, OAUTH_STATE_TTL_SECONDS));
    const url = new URL("https://discord.com/oauth2/authorize");
    url.search = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: "identify",
      state,
      redirect_uri: redirectUri,
    });
    response.redirect(url.href);
  }

  async function finishLogin(request, response) {
    const { code, state, error } = request.query;
    const expectedState = getCookie(request, OAUTH_STATE_COOKIE);
    response.append("Set-Cookie", clearCookie(OAUTH_STATE_COOKIE));
    if (error || typeof code !== "string" || !code || typeof state !== "string" || !state) {
      response.redirect(redirectTarget("/admin?auth=denied"));
      return;
    }
    const expected = Buffer.from(expectedState);
    const actual = Buffer.from(state);
    if (!expectedState || expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      response.status(400).json({ error: "Invalid Discord login state." });
      return;
    }

    try {
      const user = await exchangeCode(code);
      const session = createSession(user);
      setSession(response, session.token);
      response.redirect(redirectTarget("/admin"));
    } catch (error) {
      response.redirect(redirectTarget("/admin?auth=error"));
    }
  }

  return {
    isConfigured,
    getSession,
    getUser: getSession,
    isAdmin: (request) => {
      const user = getSession(request);
      return user ? adminIds().has(user.discordId) : false;
    },
    createSession,
    setSession,
    clearSession,
    startLogin,
    finishLogin,
  };
}

export { SESSION_COOKIE, OAUTH_STATE_COOKIE };
