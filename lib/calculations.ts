export type InvoiceItem = {
  description: string;
  quantity: number;
  rate: number;
  card_tax_rate?: number;
};
export type AdjustmentInput = {
  line_items: InvoiceItem[];
  tax_rate?: number;
  discount?: number;
  discount_mode?: "fixed" | "percent";
  delivery?: number;
};
const round = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
function amount(value: unknown, name: string, max = 1e10): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0 || n > max)
    throw new Error(name + " is invalid.");
  return n;
}
export function calculateInvoice(input: AdjustmentInput) {
  if (!Array.isArray(input.line_items) || input.line_items.length > 100)
    throw new Error("Use at most 100 line items.");
  const items = input.line_items.map((item) => {
    const description = String(item.description || "").trim();
    if (description.length > 1000)
      throw new Error("Item description is too long.");
    const quantity = amount(item.quantity, "Quantity", 1e6);
    const rate = amount(item.rate, "Rate", 1e8);
    const card_tax_rate = amount(
      item.card_tax_rate,
      "Card tax percentage",
      100,
    );
    const base = round(quantity * rate);
    if (base > 1e10) throw new Error("Line amount is too large.");
    return {
      description,
      quantity,
      rate,
      amount: base,
      card_tax_rate,
      card_tax_amount: round((base * card_tax_rate) / 100),
    };
  });
  const sub = round(items.reduce((sum, item) => sum + item.amount, 0));
  if (
    input.discount_mode &&
    !["fixed", "percent"].includes(input.discount_mode)
  )
    throw new Error("Invalid discount type.");
  const discountValue = amount(
    input.discount,
    "Discount",
    input.discount_mode === "percent" ? 100 : 1e10,
  );
  const discount =
    input.discount_mode === "percent"
      ? round((sub * discountValue) / 100)
      : round(discountValue);
  if (discount > sub) throw new Error("Discount cannot exceed the subtotal.");
  const taxRate = amount(input.tax_rate, "Invoice tax percentage", 100);
  const taxBase = round(sub - discount);
  const tax = round((taxBase * taxRate) / 100);
  const cardTax = round(
    items.reduce((sum, item) => sum + item.card_tax_amount, 0),
  );
  const delivery = round(amount(input.delivery, "Delivery"));
  const total = round(taxBase + tax + cardTax + delivery);
  return {
    items,
    sub,
    discount,
    taxBase,
    taxRate,
    tax,
    cardTax,
    delivery,
    total,
  };
}
