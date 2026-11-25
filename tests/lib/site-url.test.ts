import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";
import { siteUrlFrom } from "@/lib/site-url";

describe("siteUrlFrom", () => {
  it("uses the configured URL when set, without a trailing slash", () => {
    // Arrange
    const h = new Headers({ host: "example.vercel.app" });

    // Act
    const url = siteUrlFrom("https://configured.example/", h);

    // Assert
    expect(url).toBe("https://configured.example");
  });

  it("uses the forwarded host and protocol when no URL is configured", () => {
    // Arrange
    const h = new Headers({ host: "internal:3000", "x-forwarded-host": "app.vercel.app", "x-forwarded-proto": "https" });

    // Act
    const url = siteUrlFrom(null, h);

    // Assert
    expect(url).toBe("https://app.vercel.app");
  });

  it("takes the first value of comma-separated forwarded headers", () => {
    // Arrange
    const h = new Headers({ "x-forwarded-host": "a.example, b.example", "x-forwarded-proto": "https, http" });

    // Act
    const url = siteUrlFrom(null, h);

    // Assert
    expect(url).toBe("https://a.example");
  });

  it("uses http for a localhost host with no forwarded protocol", () => {
    // Arrange
    const h = new Headers({ host: "localhost:6972" });

    // Act
    const url = siteUrlFrom(null, h);

    // Assert
    expect(url).toBe("http://localhost:6972");
  });

  it("uses https for a public host with no forwarded protocol", () => {
    // Arrange
    const h = new Headers({ host: "app.example" });

    // Act
    const url = siteUrlFrom(null, h);

    // Assert
    expect(url).toBe("https://app.example");
  });

  it("falls back to localhost when there is no host header", () => {
    // Arrange
    const h = new Headers();

    // Act
    const url = siteUrlFrom(null, h);

    // Assert
    expect(url).toBe("http://localhost:6972");
  });
});

describe("parseEnv siteUrl", () => {
  it("is null when NEXT_PUBLIC_SITE_URL is unset", () => {
    // Arrange / Act
    const env = parseEnv({});

    // Assert
    expect(env.siteUrl).toBeNull();
  });

  it("strips trailing slashes from NEXT_PUBLIC_SITE_URL", () => {
    // Arrange / Act
    const env = parseEnv({ NEXT_PUBLIC_SITE_URL: "https://app.example//" });

    // Assert
    expect(env.siteUrl).toBe("https://app.example");
  });
});
