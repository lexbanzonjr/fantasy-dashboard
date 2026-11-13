"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { credentials, MISSING_LOGIN } from "./server";
import { checkCredentials, createSession, safeNext, SESSION_COOKIE } from "./session";

export interface LoginState {
  error: string | null;
}

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const creds = credentials();
  if (!creds) return { error: MISSING_LOGIN };
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");
  if (!checkCredentials(creds, username, password)) {
    // Slows down guessing.
    await new Promise((r) => setTimeout(r, 1000));
    return { error: "That username and password don't match." };
  }
  const session = createSession(creds);
  (await cookies()).set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: session.expires,
  });
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
