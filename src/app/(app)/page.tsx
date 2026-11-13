import { requireSignIn } from "@/lib/auth/server";

// Placeholder until the dashboard lands.
export default async function Home() {
  await requireSignIn();
  return <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>;
}
