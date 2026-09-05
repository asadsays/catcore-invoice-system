"use client";
import { useEffect, useState } from "react";
export default function PaymentSettings() {
  const [banks, setBanks] = useState<any[]>([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/payment-settings")
      .then((r) => {
        if (!r.ok)
          throw new Error(
            "Unable to load payment settings. Reload before editing.",
          );
        return r.json();
      })
      .then((d) => {
        if (active) {
          setBanks(d.banks);
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (active) setMessage(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  const update = (i: number, key: string, value: any) =>
    setBanks((list) =>
      list.map((b, n) => (n === i ? { ...b, [key]: value } : b)),
    );
  const save = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/payment-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banks }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessage("Payment mediums saved.");
      setBanks(d.banks);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="payment-settings">
      <h2>Payment mediums</h2>
      <p>
        The official default bank appears on printed invoices. Clients can
        select other banks online.
      </p>
      {message ? <p role="status">{message}</p> : null}
      {banks.map((b, i) => (
        <fieldset key={i}>
          <legend>Payment medium {i + 1}</legend>
          {["name", "title", "account", "iban"].map((key) => (
            <label key={key}>
              {
                (
                  {
                    name: "Bank name",
                    title: "Account title",
                    account: "Account number",
                    iban: "IBAN",
                  } as any
                )[key]
              }
              <input
                value={b[key]}
                onChange={(e) => update(i, key, e.target.value)}
                maxLength={160}
              />
            </label>
          ))}
          <label>
            <input
              type="radio"
              name="official-bank"
              checked={b.is_default}
              onChange={() =>
                setBanks((list) =>
                  list.map((x, n) => ({ ...x, is_default: n === i })),
                )
              }
            />
            Official default bank
          </label>
          <button
            onClick={() => setBanks((list) => list.filter((_, n) => n !== i))}
          >
            Remove
          </button>
        </fieldset>
      ))}
      <button
        disabled={!loaded || busy || banks.length >= 12}
        onClick={() =>
          setBanks((list) => [
            ...list,
            {
              name: "",
              title: "",
              account: "",
              iban: "",
              is_default: list.length === 0,
            },
          ])
        }
      >
        Add payment medium
      </button>
      <button className="primary" disabled={busy || !loaded} onClick={save}>
        {busy ? "Saving..." : "Save payment settings"}
      </button>
    </section>
  );
}
