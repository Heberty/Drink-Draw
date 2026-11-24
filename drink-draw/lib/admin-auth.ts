import { createHmac, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { PanelUser } from "@/lib/panel-users";
import { sqlite } from "@/lib/sqlite";

export const adminCookie = "drink-draw-admin";
export const adminSessionSeconds = 8 * 60 * 60;

export type SessionUser = PanelUser & { sessionVersion: number };
type StoredUser = SessionUser & { passwordHash: string };
const deriveKey = promisify(scrypt);
const dummySalt = "3fa9ff822cb44d9e96449b47f587f59a";
type Bootstrap = { username: string; password: string };

function sessionSecret() {
  const secret = process.env.DRINK_DRAW_SESSION_SECRET;
  return secret && Buffer.byteLength(secret) >= 32 ? secret : null;
}

function bootstrapCredentials(): Bootstrap | null {
  const username = process.env.DRINK_DRAW_ADMIN_USER?.trim();
  const password = process.env.DRINK_DRAW_ADMIN_PASSWORD;
  return username && username.length <= 120 && password && password.length <= 256 ? { username, password } : null;
}

export async function hashPanelPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await deriveKey(password, salt, 32) as Buffer;
  return salt + ":" + key.toString("hex");
}

async function checkPassword(password: string, hash?: string) {
  const [salt, expected] = hash?.split(":") ?? [dummySalt, "0".repeat(64)];
  const derived = await deriveKey(password, salt, 32) as Buffer;
  return Boolean(hash) && /^[a-f0-9]{64}$/.test(expected) && timingSafeEqual(derived, Buffer.from(expected, "hex"));
}

export function adminLoginConfigured() {
  return Boolean(sessionSecret() && (bootstrapCredentials() || sqlite<boolean>("has_users")));
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export async function startPanelSession(username: string, password: string, now = Date.now()) {
  const secret = sessionSecret();
  if (!secret) return null;

  const bootstrap = bootstrapCredentials();
  if (bootstrap && !sqlite<boolean>("has_users")) {
    const passwordHash = await hashPanelPassword(bootstrap.password);
    sqlite("bootstrap", { user: { id: randomUUID(), username: bootstrap.username, name: "Administrador", passwordHash } });
  }

  const user = sqlite<StoredUser | null>("user_by_name", { value: username });
  if (!(await checkPassword(password, user?.passwordHash)) || !user) return null;
  const expiration = Math.floor(now / 1000) + adminSessionSeconds;
  const value = `${user.id}.${user.sessionVersion}.${expiration}`;
  return value + "." + sign(value, secret);
}

export function verifyPanelSession(token: string | undefined, now = Date.now()) {
  const secret = sessionSecret();
  const match = token?.match(/^([a-f0-9-]{36})\.(\d{1,12})\.(\d{1,12})\.([A-Za-z0-9_-]{43})$/);
  if (!secret || !match) return null;

  const [, id, version, expiration, signature] = match;
  const current = Math.floor(now / 1000);
  const expires = Number(expiration);
  if (expires <= current || expires > current + adminSessionSeconds) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(sign(`${id}.${version}.${expiration}`, secret)))) return null;

  const user = sqlite<StoredUser | null>("user_by_id", { value: id });
  if (!user || user.sessionVersion !== Number(version)) return null;
  const { passwordHash: _password, ...session } = user;
  return session;
}

export async function getPanelSession() {
  return verifyPanelSession((await cookies()).get(adminCookie)?.value);
}

export async function requirePanelSession() {
  const user = await getPanelSession();
  if (!user) redirect("/admin/login");
  return user;
}

export async function requireAdministrator() {
  const user = await requirePanelSession();
  if (user.role !== "admin") redirect("/admin");
  return user;
}
