# Invoice v2

## Included

- A5 portrait PDF matching Catcore cyan, black and white branding with embedded fonts.
- Shared calculations for editor, preview and create API; stored amounts used for historical invoices.
- Optional card tax per line, fixed/percentage invoice discount, optional overall tax and delivery.
- Card tax is based on the original selected line amount. Invoice discount is based on the item subtotal. Overall tax applies after discount, excluding card tax and delivery.
- Mandatory draft preview with an exact A5 PDF preview link. PDF and email use the same renderer.
- Payment settings (up to 12 banks) and one official bank for PDFs.
- Unguessable, revocable online invoice links. Anyone holding a link can view that invoice and configured receiving banks, not the dashboard or other invoices.
- QR and clickable online link in PDF; WhatsApp opens manual click-to-chat with the invoice link.
- English sign-in copy and mobile bottom navigation.

## Verification

Run `npm run build`, `node --import tsx lib/calculations.test.ts`, and `node --import tsx scripts/test-pdf.ts`.
PDF test outputs are local fixtures under `tmp/pdfs` and never production invoices.
Build and calculation tests pass. Rendered A5 single-page and multipage PDFs were inspected.
Authenticated Neon round-trip, mobile browser interaction, email delivery and live QR resolution still need deployment verification.

## Setup and operational notes

Uses the existing POSTGRES_URL or DATABASE_URL. Two additive tables are created lazily: invoice_payment_settings and invoice_public_links. No existing invoice data is modified.
Enter real receiving banks in Settings; no sample account numbers are seeded.
Email still requires RESEND_API_KEY and a verified INVOICE_FROM_EMAIL. No emails are sent by preview or approval.
Links in downloaded PDFs target https://catcore-invoice-system.vercel.app. Change lib/invoice-link.ts if the production hostname changes.
Revoking a link invalidates its existing QR. Creating another online link, PDF or email produces a new link after revocation; previously shared PDFs must be replaced.
New dependencies are open-source qrcode and build/test helpers; no paid API or Vercel plan change is introduced. Hosting/database quotas and provider plan terms still apply.

## Remaining verification before production promotion

1. Sign in on the Vercel preview.
2. Configure actual receiving banks and pick the official bank.
3. Preview a two-line draft (25,000 service + 40,000 ads, ads-only card tax 10%). Expect 69,000 without invoice discount/tax.
4. Add 10% discount and 5% overall tax. Expect 65,425.
5. Approve once, download PDF, verify online link/QR and official bank only in PDF.
6. Test bank selection and copy, revoke the link, and confirm the old URL is unavailable.
7. Verify 390px mobile navigation and editing. Test email only with an explicitly approved recipient after Resend is configured.
