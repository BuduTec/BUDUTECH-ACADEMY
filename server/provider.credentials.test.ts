import { describe, expect, it } from "vitest";

describe("provider credentials", () => {
  it("authenticates with Paystack through a lightweight bank-list request", async () => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    expect(secret, "PAYSTACK_SECRET_KEY must be configured").toBeTruthy();
    const response = await fetch("https://api.paystack.co/bank?currency=NGN", {
      headers: { Authorization: `Bearer ${secret}` },
    });
    expect(response.status, "Paystack credentials must permit authenticated API access").toBe(200);
  }, 20_000);

  it("authenticates with Resend through a lightweight domain-list request", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey, "RESEND_API_KEY must be configured").toBeTruthy();
    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(response.status, "Resend credentials must permit authenticated API access").toBe(200);
  }, 20_000);
});
