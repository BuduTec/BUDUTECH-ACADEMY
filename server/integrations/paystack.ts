import { ENV } from "../_core/env";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

type PaystackEnvelope<T> = {
  status: boolean;
  message: string;
  data: T;
};

export type PaystackInitialization = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export type PaystackVerification = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  customer: { email: string };
  metadata: unknown;
};

function getAuthHeaders() {
  if (!ENV.paystackSecretKey) throw new Error("Paystack is not configured.");
  return { Authorization: `Bearer ${ENV.paystackSecretKey}`, "Content-Type": "application/json" };
}

async function readResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => null)) as PaystackEnvelope<T> | null;
  if (!response.ok || !payload?.status) throw new Error(payload?.message ?? "Paystack request failed.");
  return payload.data;
}

export async function initializePaystackTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  courseId: number;
  userId: number;
}) {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: { courseId: input.courseId, userId: input.userId, product: "BuduTech Academy course" },
    }),
  });
  return readResponse<PaystackInitialization>(response);
}

export async function verifyPaystackTransaction(reference: string) {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: getAuthHeaders(),
  });
  return readResponse<PaystackVerification>(response);
}
