import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/auth/server";
import { safeNext } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · Fantasy Dashboard" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const target = safeNext(next);
  if (await isSignedIn()) redirect(target);
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(ellipse_at_top,var(--color-primary)/12%,transparent_60%)] px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card/80 p-8 shadow-2xl backdrop-blur">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Fantasy Dashboard</h1>
        <LoginForm next={target} />
      </div>
    </main>
  );
}
