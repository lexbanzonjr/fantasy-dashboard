"use client";

import { useEffect, useRef } from "react";

// React blocks javascript: URLs in href, so the bookmarklet's href is set directly on the element.
export function BookmarkletLink({ source }: { source: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    ref.current?.setAttribute("href", source);
  }, [source]);
  return (
    <a
      ref={ref}
      onClick={(e) => e.preventDefault()}
      className="inline-flex h-8 cursor-grab items-center rounded-lg border bg-secondary px-3 text-sm font-medium"
      title="Drag me to your bookmarks bar"
    >
      Connect to Fantasy Dashboard
    </a>
  );
}
