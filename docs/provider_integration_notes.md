# Payment and Email Integration Notes

## Paystack

The Academy uses the hosted-checkout redirect flow. The server initializes a transaction with `POST https://api.paystack.co/transaction/initialize`, authenticating with `Authorization: Bearer SECRET_KEY`. The request includes the customer email, amount in the currency subunit, a unique reference, and a callback URL. Paystack returns `authorization_url`, `access_code`, and `reference` for redirecting the student. The Academy verifies the result server-side with `GET https://api.paystack.co/transaction/verify/{reference}` and grants enrollment only when `data.status` is `success`, the expected amount matches, and the user/course metadata matches the pending enrollment.

Paystack recommends server-side verification, and its verification guidance cautions that the outer API response status is distinct from `data.status`, which represents the actual transaction state. For digital value, it also warns against delivering value more than once for one transaction reference.

Sources: [Paystack Transaction API](https://paystack.com/docs/api/transaction/) and [Paystack Verify Payments](https://paystack.com/docs/payments/verify-payments/).

## Resend

The Academy sends transactional email with `POST https://api.resend.com/emails`. The request uses a verified `from` sender, recipient, subject, HTML/text body, Bearer API authorization, a User-Agent header, and an idempotency key to reduce duplicate messages. Resend documents that direct API clients must include `Authorization: Bearer re_xxxxxxxxx` and a User-Agent header; it also supports sender identities in the `Name <email@example.com>` form.

Sources: [Resend Send Email API](https://resend.com/docs/api-reference/emails/send-email) and [Resend API Introduction](https://resend.com/docs/api-reference/introduction).
