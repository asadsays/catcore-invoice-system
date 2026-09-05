"use client";
import { logo } from "@/lib/brand";
import Image from "next/image";
import { useState } from "react";
import type { Bank } from "@/lib/payments";
const money = (x: any) =>
  "Rs " + Number(x || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
export default function OnlineInvoice({
  invoice,
  banks,
  preview = false,
}: {
  invoice: any;
  banks: Bank[];
  preview?: boolean;
}) {
  const [selected, setSelected] = useState(
      banks.find((b) => b.is_default)?.id || banks[0]?.id || "",
    ),
    [notice, setNotice] = useState("");
  const bank = banks.find((b) => b.id === selected),
    official = banks.find((b) => b.is_default);
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Copied to clipboard.");
    } catch {
      setNotice(
        "Copy unavailable. Please select and copy the details manually.",
      );
    }
  };
  return (
    <div className="online-invoice">
      <article>
        <div className="online-top">
          <div>
            <h1>Invoice</h1>
            <p>{invoice.invoice_number}</p>
            <p>Issued {String(invoice.issue_date).slice(0, 10)}</p>
            <p>Due {String(invoice.due_date||'-').slice(0,10)}</p>
          </div>
          <Image
            src={logo}
            width={180}
            height={72}
            alt="Catcore Solutions"
            unoptimized
          />
        </div>
        <h3>Invoice to</h3>
        <p>
          {invoice.client_snapshot.contact_name}
          <br />
          {invoice.client_snapshot.company_name}
          <br />
          {invoice.client_snapshot.address}
        </p>
        {invoice.client_snapshot.ntn ? (
          <p>NTN: {invoice.client_snapshot.ntn}</p>
        ) : null}
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Total price</th>
            </tr>
          </thead>
          <tbody>
            {invoice.line_items.flatMap((x: any, i: number) => [
              <tr key={i}>
                <td>{x.description}</td>
                <td>{x.quantity}</td>
                <td>{money(x.rate)}</td>
                <td>{money(x.amount??Number(x.quantity) * Number(x.rate))}</td>
              </tr>,
              ...(Number(x.card_tax_amount) > 0
                ? [
                    <tr key={i + "tax"}>
                      <td>
                        Card tax ({x.card_tax_rate}%) - {x.description}
                      </td>
                      <td />
                      <td />
                      <td>{money(x.card_tax_amount)}</td>
                    </tr>,
                  ]
                : []),
            ])}
          </tbody>
        </table>
        <div className="online-totals">
          <p>
            Subtotal <b>{money(invoice.subtotal)}</b>
          </p>
          <p>
            Discount <b>-{money(invoice.discount)}</b>
          </p>
          {invoice.line_items.some((x:any)=>Number(x.card_tax_amount)>0)?<p>Card tax <b>{money(invoice.line_items.reduce((sum:number,x:any)=>sum+Number(x.card_tax_amount||0),0))}</b></p>:null}
          <p>
            Invoice tax ({invoice.tax_rate}%) <b>{money(invoice.tax_amount)}</b>
          </p>
          {Number(invoice.delivery) > 0 ? (
            <p>
              Delivery <b>{money(invoice.delivery)}</b>
            </p>
          ) : null}
          <h2>
            Total payable <b>{money(invoice.total)}</b>
          </h2>
        </div>
        <p className="invoice-notes">{invoice.notes}</p>
        <section className={preview ? "preview-bank" : "print-bank"}>
          <h3>Bank transfer</h3>
          {official ? (
            <p>
              {official.name}
              <br />
              {official.title}
              <br />
              {official.account}
              <br />
              {official.iban}
            </p>
          ) : (
            <p>Please contact Catcore Solutions for payment details.</p>
          )}
        </section>
      </article>
      {!preview ? (
        <section className="online-payments">
          <h2>Select your payment medium</h2>
          <p>
            Choosing a bank does not complete a payment. Payments are verified
            by Catcore Solutions.
          </p>
          {banks.length ? (
            <>
              <div>
                {banks.map((b) => (
                  <button
                    key={b.id}
                    aria-pressed={selected === b.id}
                    onClick={() => setSelected(b.id)}
                  >
                    {b.name}
                    {b.is_default ? " (Official)" : ""}
                  </button>
                ))}
              </div>
              {bank ? (
                <div>
                  <h3>{bank.title}</h3>
                  {bank.account ? (
                    <p>
                      {bank.account}{" "}
                      <button onClick={() => copy(bank.account)}>
                        Copy account number
                      </button>
                    </p>
                  ) : null}
                  {bank.iban ? (
                    <p>
                      {bank.iban}{" "}
                      <button onClick={() => copy(bank.iban)}>Copy IBAN</button>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <p>
              Payment details have not been configured. Contact
              info@catcoresolutions.com.
            </p>
          )}
          <p role="status">{notice}</p>
        </section>
      ) : null}
    </div>
  );
}
