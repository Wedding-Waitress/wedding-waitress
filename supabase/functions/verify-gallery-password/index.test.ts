// Deno tests for the gallery password rate-limit helpers.
import { assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { hmacKey, trustedIp } from "./rateLimitKeys.ts";

const PEPPER = "test-pepper";

Deno.test("hmacKey is deterministic", async () => {
  assertEquals(await hmacKey(PEPPER, "a"), await hmacKey(PEPPER, "a"));
});

Deno.test("hmacKey separates devices", async () => {
  assertNotEquals(await hmacKey(PEPPER, "device:e1:d1"), await hmacKey(PEPPER, "device:e1:d2"));
});

Deno.test("hmacKey separates events", async () => {
  assertNotEquals(await hmacKey(PEPPER, "device:e1:d1"), await hmacKey(PEPPER, "device:e2:d1"));
});

Deno.test("hmacKey separates device and ip scopes", async () => {
  assertNotEquals(await hmacKey(PEPPER, "device:e1:x"), await hmacKey(PEPPER, "ip:e1:x"));
});

Deno.test("hmacKey output leaks no plaintext identifier", async () => {
  const out = await hmacKey(PEPPER, "ip:e1:203.0.113.9");
  assertEquals(out.includes("203.0.113.9"), false);
  assertEquals(/^[0-9a-f]{64}$/.test(out), true);
});

Deno.test("hmacKey depends on the pepper", async () => {
  assertNotEquals(await hmacKey(PEPPER, "x"), await hmacKey("other-pepper", "x"));
});

Deno.test("trustedIp uses the first x-forwarded-for entry", () => {
  const h = new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" });
  assertEquals(trustedIp(h), "203.0.113.5");
});

Deno.test("trustedIp falls back to cf-connecting-ip then x-real-ip", () => {
  assertEquals(trustedIp(new Headers({ "cf-connecting-ip": "198.51.100.7" })), "198.51.100.7");
  assertEquals(trustedIp(new Headers({ "x-real-ip": "198.51.100.8" })), "198.51.100.8");
});

Deno.test("trustedIp never reads a body/query supplied ip", () => {
  assertEquals(trustedIp(new Headers({ "x-client-ip": "1.2.3.4" })), "unknown");
});
