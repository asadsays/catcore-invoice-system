import assert from "node:assert/strict";
import { calculateInvoice as calc } from "./calculations.ts";
const base = {
  line_items: [
    { description: "Retainer", quantity: 1, rate: 25000 },
    { description: "Meta ads", quantity: 1, rate: 40000, card_tax_rate: 10 },
  ],
};
assert.equal(calc(base).total, 69000);
assert.equal(calc(base).cardTax, 4000);
assert.equal(calc({ ...base, tax_rate: 5 }).tax, 3250);
assert.equal(
  calc({ ...base, discount: 10, discount_mode: "percent", tax_rate: 5 }).total,
  65425,
);
assert.equal(calc({ ...base, discount: 1000 }).total, 68000);
assert.equal(
  calc({ line_items: [{ description: "Service", quantity: 1, rate: 60000 }] })
    .total,
  60000,
);
assert.throws(() => calc({ ...base, discount: 70000 }));
assert.throws(() => calc({ ...base, tax_rate: 101 }));
assert.throws(() =>
  calc({ line_items: [{ description: "bad", quantity: 1, rate: -1 }] }),
);
assert.throws(() =>
  calc({ line_items: [{ description: "bad", quantity: 1, rate: Infinity }] }),
);
console.log("10 calculation assertions passed");
