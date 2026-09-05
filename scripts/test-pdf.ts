import { writeFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
import { invoicePdf } from "../lib/invoice-pdf";
import { calculateInvoice } from "../lib/calculations";
async function main() {
  const items = [
    { description: "Social Media Retainer", quantity: 1, rate: 25000 },
    {
      description: "Meta Ads Spend",
      quantity: 1,
      rate: 40000,
      card_tax_rate: 10,
    },
  ];
  const c = calculateInvoice({
    line_items: items,
    discount: 10,
    discount_mode: "percent",
    tax_rate: 5,
  });
  const invoice = {
    invoice_number: "TEST-ONLY-001",
    client_snapshot: {
      contact_name: "Mr. Huzaifa",
      company_name: "Aitch Studio",
      address: "Karachi, Pakistan",
    },
    issue_date: "2026-09-05",
    due_date: "2026-09-12",
    line_items: c.items,
    subtotal: c.sub,
    discount: c.discount,
    tax_rate: 5,
    tax_amount: c.tax,
    delivery: 0,
    total: c.total,
    notes:
      "TEST FIXTURE - not a real invoice. Please use the invoice number as payment reference.",
  };
  mkdirSync("tmp/pdfs", { recursive: true });
  for (const [name, inv] of [
    ["a5", invoice],
    [
      "long",
      {
        ...invoice,
        line_items: Array.from({ length: 35 }, (_, i) => ({
          ...c.items[i % 2],
          description:
            "Line " +
            (i + 1) +
            ": " +
            "Extended service description ".repeat((i % 3) + 1),
        })),
      },
    ],
  ] as const) {
    const totals=calculateInvoice({line_items:inv.line_items,discount:inv.discount,tax_rate:inv.tax_rate});
    const pdf = await invoicePdf(
      {...inv,line_items:totals.items,subtotal:totals.sub,tax_amount:totals.tax,total:totals.total},
      [],
      "https://catcore-invoice-system.vercel.app/invoice/" + "a".repeat(64),
    );
    assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
    writeFileSync("tmp/pdfs/" + name + ".pdf", pdf);
  }
  console.log("PDF fixtures generated: single-page and long invoice.");
}
main();
