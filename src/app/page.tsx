import { requireSignIn } from "@/lib/auth/server";
import { logout } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

// Placeholder until the dashboard lands.
export default async function Home() {
  await requireSignIn();
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Fantasy Dashboard</h1>
      <form action={logout}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </main>
  );
}
