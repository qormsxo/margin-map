import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { getEnv } from "@/lib/env";

const COOKIE_NAME = "marginmap_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

const sessionPayloadSchema = z.object({
  userId: z.string().min(1),
  storeId: z.string().min(1),
  organizationId: z.string().min(1),
  exp: z.number().finite(),
});

export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

function sign(payloadB64: string): string {
  return createHmac("sha256", getEnv().AUTH_SECRET)
    .update(payloadB64)
    .digest("base64url");
}

export function encodeSession(payload: Omit<SessionPayload, "exp">): string {
  const full: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  };

  const payloadB64 = Buffer.from(JSON.stringify(full), "utf8").toString(
    "base64url",
  );

  return `${payloadB64}.${sign(payloadB64)}`;
}

export function decodeSession(token: string): SessionPayload | null {
  const [payloadB64, signature] = token.split(".");

  if (!payloadB64 || !signature) return null;

  const expected = sign(payloadB64);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);

  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const json: unknown = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    );

    const parsed = sessionPayloadSchema.safeParse(json);

    if (!parsed.success) return null;

    if (parsed.data.exp < Math.floor(Date.now() / 1000)) return null;

    return parsed.data;
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: Omit<SessionPayload, "exp">) {
  const jar = await cookies();

  jar.set(COOKIE_NAME, encodeSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: getEnv().NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();

  jar.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;

  if (!token) return null;

  return decodeSession(token);
}
