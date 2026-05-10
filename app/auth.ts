import { createHash, timingSafeEqual } from "crypto";

import { cookies } from "next/headers";

const authCookieName = "financials_auth";
const authCookieMaxAge = 60 * 60 * 24 * 30;

export function isPinConfigured() {
  return Boolean(getAuthPin());
}

export async function isAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value;
  const expectedToken = createAuthToken();

  return Boolean(token && expectedToken && safeEqual(token, expectedToken));
}

export async function setAuthCookie() {
  const token = createAuthToken();

  if (!token) {
    return false;
  }

  const cookieStore = await cookies();
  cookieStore.set(authCookieName, token, {
    httpOnly: true,
    maxAge: authCookieMaxAge,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return true;
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(authCookieName);
}

export function verifyPin(value: FormDataEntryValue | null) {
  const configuredPin = getAuthPin();

  if (typeof value !== "string" || !configuredPin) {
    return false;
  }

  return safeEqual(value, configuredPin);
}

function getAuthPin() {
  return process.env.AUTH_PIN?.trim();
}

function createAuthToken() {
  const pin = getAuthPin();

  if (!pin) {
    return null;
  }

  return createHash("sha256").update(`financials:${pin}`).digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
