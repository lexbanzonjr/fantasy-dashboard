import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="grid content-start gap-6">
        <Skeleton className="h-40" />
        <Skeleton className="h-96" />
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}
