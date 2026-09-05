"use client";
import { useEffect, useMemo, useState } from "react";
import OnlineInvoice from "@/components/online-invoice";
import PaymentSettings from "@/components/payment-settings";
import { calculateInvoice } from "@/lib/calculations";
import {
  LayoutDashboard,
  FileText,
  Users,
  Layers3,
  Settings,
  Plus,
  Sparkles,
  Eye,
  X,
  CircleCheck,
  Copy,
  Download,
  MessageCircle,
  Mail,
  RefreshCw,
  Trash2,
  ChevronRight,
  Database,
  Send,
} from "lucide-react";

type Client = {
  id: string;
  contact_name: string;
  company_name: string;
  email: string;
  phone: string;
  address: string;
  ntn: string;
  default_tax: number | string;
};
type Service = {
  id: string;
  name: string;
  description: string;
  default_rate: number | string;
};
type Item = {
  description: string;
  quantity: number;
  rate: number;
  amount?: number;
  card_tax_rate?: number;
  card_tax_amount?: number;
};
type Invoice = {
  id: string;
  invoice_number: string;
  client_id: string;
  client_snapshot: Client;
  issue_date: string;
  due_date: string;
  status: string;
  line_items: Item[];
  subtotal: number | string;
  tax_rate: number | string;
  tax_amount: number | string;
  discount: number | string;
  delivery: number | string;
  total: number | string;
  notes: string;
  created_at: string;
};
type Data = {
  clients: Client[];
  services: Service[];
  invoices: Invoice[];
  metrics: {
    month_revenue: number | string;
    outstanding: number | string;
    month_paid: number | string;
    invoice_count: number | string;
  };
  database: string;
};
type Draft = {
  discount_mode?: "fixed" | "percent";
  client: Client | null;
  issue_date: string;
  due_date: string;
  line_items: Item[];
  tax_rate: number;
  discount: number;
  delivery: number;
  notes: string;
  status: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const emptyDraft = (): Draft => ({
  client: null,
  issue_date: today(),
  due_date: plusDays(7),
  line_items: [{ description: "", quantity: 1, rate: 0 }],
  tax_rate: 0,
  discount: 0,
  delivery: 0,
  notes: "Please use the invoice number as your payment reference.",
  status: "Sent",
});
const money = (v: unknown) =>
  "Rs" + Number(v || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const totalOf = (d: Draft) => calculateInvoice(d);

export default function InvoiceApp() {
  const [view, setView] = useState("Overview"),
    [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<
      "invoice" | "preview" | "client" | "service" | null
    >(null),
    [draft, setDraft] = useState<Draft>(emptyDraft),
    [busy, setBusy] = useState(false),
    [command, setCommand] = useState("");
  const [notice, setNotice] = useState(""),
    [health, setHealth] = useState({
      database: false,
      email: false,
      sender: false,
    });
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/dashboard", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Unable to load");
      setData(j);
      const h = await fetch("/api/health", { cache: "no-store" }).then((x) =>
        x.json(),
      );
      setHealth(h);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const result = useMemo(() => {
    try {
      return { calc: totalOf(draft), error: "" };
    } catch (e) {
      return {
        calc: { sub: 0, tax: 0, total: 0, discount: 0, cardTax: 0, taxBase: 0 },
        error: e instanceof Error ? e.message : "Invalid amounts",
      };
    }
  }, [draft]);
  const calc = result.calc;
  const openInvoice = (client?: Client, service?: Service) => {
    const d = emptyDraft();
    if (client) d.client = client;
    if (service)
      d.line_items = [
        {
          description: service.name,
          quantity: 1,
          rate: Number(service.default_rate),
        },
      ];
    else if (client)
      d.line_items = [
        { description: "Social Media Retainer", quantity: 1, rate: 60000 },
      ];
    d.tax_rate = Number(client?.default_tax || 0);
    setDraft(d);
    setDialog("invoice");
  };
  const duplicate = (inv: Invoice) => {
    setDraft({
      client: inv.client_snapshot,
      issue_date: today(),
      due_date: plusDays(7),
      line_items: inv.line_items.map((x) => ({
        description: x.description,
        quantity: Number(x.quantity),
        rate: Number(x.rate),
        card_tax_rate: Number(x.card_tax_rate || 0),
      })),
      tax_rate: Number(inv.tax_rate),
      discount: Number(inv.discount),
      delivery: Number(inv.delivery),
      notes: inv.notes,
      status: "Sent",
    });
    setDialog("invoice");
  };
  const parseCommand = () => {
    if (!data) return;
    const q = command.toLowerCase();
    const client =
      data.clients.find((x) => q.includes(x.company_name.toLowerCase())) ||
      null;
    const service =
      data.services.find((x) => q.includes(x.name.toLowerCase())) ||
      data.services.find((x) => q.includes(x.name.split(" ")[0].toLowerCase()));
    const k = q.match(/(?:rs\s*)?([\d,.]+)\s*k\b/),
      plain = q.match(/(?:rs\s*)?([\d,]{4,})/);
    const amount = k
      ? Number(k[1].replaceAll(",", "")) * 1000
      : plain
        ? Number(plain[1].replaceAll(",", ""))
        : Number(service?.default_rate || 0);
    const tax = q.match(/(\d+(?:\.\d+)?)\s*%/);
    const d = emptyDraft();
    d.client = client;
    d.line_items = [
      {
        description:
          service?.name ||
          (q.includes("social")
            ? "Social Media Retainer"
            : "Professional Services"),
        quantity: 1,
        rate: amount,
      },
    ];
    d.tax_rate =
      q.includes("zero tax") || q.includes("0 tax")
        ? 0
        : tax
          ? Number(tax[1])
          : Number(client?.default_tax || 0);
    setDraft(d);
    setDialog("invoice");
  };
  const approve = async () => {
    if (result.error) return setNotice(result.error);
    if (!draft.client) return setNotice("Please select a client.");
    setBusy(true);
    try {
      const r = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setDialog(null);
      setNotice(`Invoice ${j.invoice_number} generated successfully.`);
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Unable to create invoice");
    } finally {
      setBusy(false);
    }
  };
  const pdf = async (inv: Invoice) => {
    try {
      const r = await fetch(`/api/invoices/${inv.id}/pdf`, { method: "POST" });
      if (!r.ok) throw new Error((await r.json()).error);
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = inv.invoice_number + ".pdf";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Unable to download PDF");
    }
  };
  const whatsapp = async (inv: Invoice) => {
    try {
      const r = await fetch(`/api/invoices/${inv.id}/share`, {
        method: "POST",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      let p = (inv.client_snapshot.phone || "").replace(/\D/g, "");
      if (p.startsWith("0")) p = "92" + p.slice(1);
      const msg = encodeURIComponent(
        `Dear ${inv.client_snapshot.contact_name}, Catcore Solutions invoice ${inv.invoice_number}. Total: ${money(inv.total)}. View invoice and payment options: ${window.location.origin + j.path}`,
      );
      window.location.assign(`https://wa.me/${p}?text=${msg}`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Unable to open WhatsApp");
    }
  };
  const email = async (inv: Invoice) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/invoices/${inv.id}/email`, {
        method: "POST",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setNotice("Invoice email sent.");
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Unable to send email");
    } finally {
      setBusy(false);
    }
  };
  const status = async (inv: Invoice, value: string) => {
    await fetch(`/api/invoices/${inv.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: value }),
    });
    await load();
  };
  const nav = [
    ["Overview", LayoutDashboard],
    ["Invoices", FileText],
    ["Clients", Users],
    ["Services", Layers3],
    ["Settings", Settings],
  ] as const;
  return (
    <div className="app">
      <aside>
        <div className="brand">
          CATCORE<small>ACCOUNTS</small>
        </div>
        <nav>
          {nav.map(([n, I]) => (
            <button
              key={n}
              className={view === n ? "active" : ""}
              onClick={() => setView(n)}
            >
              <I />
              {n}
            </button>
          ))}
        </nav>
        <div className="user">
          <b>AS</b>
          <span>
            Asad Ali Shaikh<small>Administrator</small>
          </span>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <h1>{view}</h1>
            <p>
              {view === "Overview"
                ? "Your Catcore billing workspace."
                : "Manage " + view.toLowerCase() + " and billing records."}
            </p>
          </div>
          <button className="primary" onClick={() => openInvoice()}>
            <Plus />
            Create invoice
          </button>
        </header>
        {notice ? (
          <div className="notice" role="status">
            {notice}
            <button onClick={() => setNotice("")}>
              <X />
            </button>
          </div>
        ) : null}
        {loading ? (
          <div className="state">
            <RefreshCw className="spin" />
            Loading your workspace...
          </div>
        ) : error ? (
          <div className="state error">
            <Database />
            <b>Database connection needs attention</b>
            <span>{error}</span>
            <button onClick={load}>Try again</button>
          </div>
        ) : data ? (
          <>
            {view === "Overview" ? (
              <Overview
                data={data}
                command={command}
                setCommand={setCommand}
                parseCommand={parseCommand}
                openInvoice={openInvoice}
                setView={setView}
              />
            ) : null}
            {view === "Invoices" ? (
              <Invoices
                invoices={data.invoices}
                duplicate={duplicate}
                pdf={pdf}
                whatsapp={whatsapp}
                email={email}
                status={status}
              />
            ) : null}
            {view === "Clients" ? (
              <Clients
                clients={data.clients}
                add={() => setDialog("client")}
                openInvoice={openInvoice}
              />
            ) : null}
            {view === "Services" ? (
              <Services
                services={data.services}
                add={() => setDialog("service")}
                openInvoice={openInvoice}
              />
            ) : null}
            {view === "Settings" ? (
              <>
                <SettingsView health={health} />
                <PaymentSettings />
              </>
            ) : null}
          </>
        ) : null}
      </main>
      {dialog === "invoice" ? (
        <InvoiceEditor
          draft={draft}
          setDraft={setDraft}
          clients={data?.clients || []}
          services={data?.services || []}
          calc={calc}
          close={() => setDialog(null)}
          preview={() => {
            if (result.error) {
              setNotice(result.error);
              return;
            }
            if (draft.client) setDialog("preview");
          }}
        />
      ) : null}
      {dialog === "preview" ? (
        <Preview
          draft={draft}
          calc={calc}
          back={() => setDialog("invoice")}
          approve={approve}
          busy={busy}
        />
      ) : null}
      {dialog === "client" ? (
        <CreateClient
          close={() => setDialog(null)}
          done={async () => {
            setDialog(null);
            await load();
          }}
        />
      ) : null}
      {dialog === "service" ? (
        <CreateService
          close={() => setDialog(null)}
          done={async () => {
            setDialog(null);
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

function Overview({
  data,
  command,
  setCommand,
  parseCommand,
  openInvoice,
  setView,
}: any) {
  const m = data.metrics;
  return (
    <>
      <section className="metrics">
        <article>
          <span>Revenue this month</span>
          <strong>{money(m.month_revenue)}</strong>
          <small>Approved invoices</small>
        </article>
        <article>
          <span>Outstanding</span>
          <strong>{money(m.outstanding)}</strong>
          <small>Sent and overdue</small>
        </article>
        <article>
          <span>Paid this month</span>
          <strong>{money(m.month_paid)}</strong>
          <small>Payments received</small>
        </article>
        <article>
          <span>Total invoices</span>
          <strong>{Number(m.invoice_count)}</strong>
          <small>Stored in Neon</small>
        </article>
      </section>
      <section className="ai">
        <Sparkles />
        <div>
          <b>Invoice assistant</b>
          <p>Describe your invoice. Review every detail before saving.</p>
          <div className="command">
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Invoice Aitch Studio 60K social media, zero tax"
            />
            <button onClick={parseCommand}>Create draft</button>
          </div>
        </div>
      </section>
      <div className="title">
        <div>
          <h2>Quick invoices</h2>
          <p>Routine clients, ready as editable drafts.</p>
        </div>
        <button onClick={() => setView("Clients")}>Manage clients →</button>
      </div>
      <section className="quick">
        {data.clients.slice(0, 3).map((c: Client, i: number) => (
          <article key={c.id}>
            <i>0{i + 1}</i>
            <h3>{c.company_name}</h3>
            <p>{c.contact_name}</p>
            <div>
              <span>Social Media Retainer</span>
              <b>Rs60,000</b>
            </div>
            <button onClick={() => openInvoice(c)}>
              <Eye />
              Preview draft
            </button>
          </article>
        ))}
      </section>
      <Recent
        invoices={data.invoices.slice(0, 5)}
        onAll={() => setView("Invoices")}
      />
    </>
  );
}
function Recent({
  invoices,
  onAll,
}: {
  invoices: Invoice[];
  onAll: () => void;
}) {
  return (
    <>
      <div className="title">
        <div>
          <h2>Recent invoices</h2>
          <p>Your latest billing activity.</p>
        </div>
        <button onClick={onAll}>View all →</button>
      </div>
      <InvoiceTable invoices={invoices} />
    </>
  );
}
function Invoices({ invoices, duplicate, pdf, whatsapp, email, status }: any) {
  return (
    <section>
      <div className="toolbar">
        <h2>All invoices</h2>
        <span>{invoices.length} records</span>
      </div>
      <InvoiceTable
        invoices={invoices}
        actions={{ duplicate, pdf, whatsapp, email, status }}
      />
    </section>
  );
}
function InvoiceTable({
  invoices,
  actions,
}: {
  invoices: Invoice[];
  actions?: any;
}) {
  return (
    <div className="table">
      <div className="tr labels">
        <span>Invoice</span>
        <span>Client</span>
        <span>Issued</span>
        <span>Amount</span>
        <span>Status</span>
        {actions ? <span>Actions</span> : null}
      </div>
      {invoices.length ? (
        invoices.map((inv) => (
          <div className={"tr " + (actions ? "with-actions" : "")} key={inv.id}>
            <b>{inv.invoice_number}</b>
            <span>
              {inv.client_snapshot.company_name}
              <small>{inv.line_items[0]?.description}</small>
            </span>
            <span>{String(inv.issue_date).slice(0, 10)}</span>
            <strong>{money(inv.total)}</strong>
            {actions ? (
              <select
                value={inv.status}
                onChange={(e) => actions.status(inv, e.target.value)}
              >
                <option>Draft</option>
                <option>Sent</option>
                <option>Paid</option>
                <option>Overdue</option>
                <option>Cancelled</option>
              </select>
            ) : (
              <em className={inv.status.toLowerCase()}>{inv.status}</em>
            )}
            {actions ? (
              <div className="row-actions">
                <button
                  title="Online view"
                  onClick={async () => {
                    try {
                      const r = await fetch(`/api/invoices/${inv.id}/share`, {
                        method: "POST",
                      });
                      const d = await r.json();
                      if (!r.ok) throw new Error(d.error);
                      window.location.assign(d.path);
                    } catch (e) {
                      alert(
                        e instanceof Error
                          ? e.message
                          : "Unable to open invoice",
                      );
                    }
                  }}
                >
                  <Eye />
                </button>
                <button
                  title="Revoke online link"
                  onClick={async () => {
                    if (!confirm("Disable this invoice link and its QR code?"))
                      return;
                    const r = await fetch(`/api/invoices/${inv.id}/share`, {
                      method: "DELETE",
                    });
                    alert(
                      r.ok ? "Online link revoked." : "Unable to revoke link.",
                    );
                  }}
                >
                  <X />
                </button>
                <button
                  title="Duplicate"
                  onClick={() => actions.duplicate(inv)}
                >
                  <Copy />
                </button>
                <button title="PDF" onClick={() => actions.pdf(inv)}>
                  <Download />
                </button>
                <button title="WhatsApp" onClick={() => actions.whatsapp(inv)}>
                  <MessageCircle />
                </button>
                <button title="Email" onClick={() => actions.email(inv)}>
                  <Mail />
                </button>
              </div>
            ) : null}
          </div>
        ))
      ) : (
        <div className="empty">No invoices yet. Create your first invoice.</div>
      )}
    </div>
  );
}
function Clients({ clients, add, openInvoice }: any) {
  return (
    <>
      <div className="toolbar">
        <div>
          <h2>Clients</h2>
          <span>Billing profiles and contact details</span>
        </div>
        <button className="primary" onClick={add}>
          <Plus />
          Add client
        </button>
      </div>
      <div className="cards">
        {clients.map((c: Client) => (
          <article key={c.id}>
            <div className="avatar">{c.company_name[0]}</div>
            <h3>{c.company_name}</h3>
            <p>{c.contact_name}</p>
            <small>
              {c.email || "Email not added"}
              <br />
              {c.phone || "WhatsApp not added"}
              <br />
              {c.ntn ? "NTN " + c.ntn : "NTN not added"}
            </small>
            <button onClick={() => openInvoice(c)}>
              Create invoice <ChevronRight />
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
function Services({ services, add, openInvoice }: any) {
  return (
    <>
      <div className="toolbar">
        <div>
          <h2>Services</h2>
          <span>Reusable invoice line items</span>
        </div>
        <button className="primary" onClick={add}>
          <Plus />
          Add service
        </button>
      </div>
      <div className="cards">
        {services.map((s: Service) => (
          <article key={s.id}>
            <i>SERVICE</i>
            <h3>{s.name}</h3>
            <p>{s.description}</p>
            <strong>{money(s.default_rate)}</strong>
            <button onClick={() => openInvoice(undefined, s)}>
              Use in invoice <ChevronRight />
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
function SettingsView({ health }: { health: any }) {
  return (
    <div className="settings-grid">
      <h2>Connections</h2>
      <div>
        <Database />
        <span>
          <b>Neon database</b>
          <small>Clients and invoices</small>
        </span>
        <em className={health.database ? "ok" : "bad"}>
          {health.database ? "Connected" : "Needs attention"}
        </em>
      </div>
      <div>
        <Mail />
        <span>
          <b>Resend email</b>
          <small>Verified sender configured in Vercel</small>
        </span>
        <em className={health.email && health.sender ? "ok" : "warn"}>
          {health.email && health.sender ? "Ready" : "Configuration required"}
        </em>
      </div>
      <div>
        <MessageCircle />
        <span>
          <b>WhatsApp</b>
          <small>Manual click-to-chat</small>
        </span>
        <em className="ok">Ready</em>
      </div>
    </div>
  );
}

function InvoiceEditor({
  draft,
  setDraft,
  clients,
  services,
  calc,
  close,
  preview,
}: any) {
  const set = (k: string, v: any) => setDraft((d: Draft) => ({ ...d, [k]: v }));
  const item = (i: number, k: string, v: any) =>
    setDraft((d: Draft) => ({
      ...d,
      line_items: d.line_items.map((x, n) => (n === i ? { ...x, [k]: v } : x)),
    }));
  return (
    <div className="overlay">
      <div className="modal editor">
        <button className="close" onClick={close}>
          <X />
        </button>
        <label>CREATE INVOICE</label>
        <h2>Build an invoice draft</h2>
        <p>Complete the details, then review the mandatory preview.</p>
        <div className="form-grid">
          <label>
            Client
            <select
              value={draft.client?.id || ""}
              onChange={(e) =>
                set(
                  "client",
                  clients.find(
                    (x: Client) => String(x.id) === e.target.value,
                  ) || null,
                )
              }
            >
              <option value="">Select client</option>
              {clients.map((c: Client) => (
                <option key={c.id} value={c.id}>
                  {c.company_name} — {c.contact_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Issue date
            <input
              type="date"
              value={draft.issue_date}
              onChange={(e) => set("issue_date", e.target.value)}
            />
          </label>
          <label>
            Due date
            <input
              type="date"
              value={draft.due_date}
              onChange={(e) => set("due_date", e.target.value)}
            />
          </label>
          <label>
            Status
            <select
              value={draft.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option>Draft</option>
              <option>Sent</option>
            </select>
          </label>
        </div>
        <div className="items">
          <div className="item head">
            <span>Description</span>
            <span>Qty</span>
            <span>Rate</span>
            <span>Card tax %</span>
            <span></span>
          </div>
          {draft.line_items.map((x: Item, i: number) => (
            <div className="item" key={i}>
              <div>
                <input
                  list="services"
                  value={x.description}
                  onChange={(e) => {
                    const s = services.find(
                      (z: Service) => z.name === e.target.value,
                    );
                    item(i, "description", e.target.value);
                    if (s) item(i, "rate", Number(s.default_rate));
                  }}
                />
                <datalist id="services">
                  {services.map((s: Service) => (
                    <option key={s.id}>{s.name}</option>
                  ))}
                </datalist>
              </div>
              <input
                type="number"
                min="0"
                value={x.quantity}
                onChange={(e) => item(i, "quantity", Number(e.target.value))}
              />
              <input
                type="number"
                min="0"
                value={x.rate}
                onChange={(e) => item(i, "rate", Number(e.target.value))}
              />
              <input
                aria-label={`Card tax percentage for item ${i + 1}`}
                type="number"
                min="0"
                max="100"
                value={x.card_tax_rate || 0}
                onChange={(e) =>
                  item(i, "card_tax_rate", Number(e.target.value))
                }
              />
              <button
                onClick={() =>
                  set(
                    "line_items",
                    draft.line_items.filter((_: Item, n: number) => n !== i),
                  )
                }
              >
                <Trash2 />
              </button>
            </div>
          ))}
          <button
            className="addline"
            onClick={() =>
              set("line_items", [
                ...draft.line_items,
                { description: "", quantity: 1, rate: 0 },
              ])
            }
          >
            <Plus />
            Add line item
          </button>
        </div>
        <div className="numbers">
          <label>
            Overall invoice tax %
            <input
              type="number"
              min="0"
              value={draft.tax_rate}
              onChange={(e) => set("tax_rate", Number(e.target.value))}
            />
          </label>
          <label>
            Delivery
            <input
              type="number"
              min="0"
              value={draft.delivery}
              onChange={(e) => set("delivery", Number(e.target.value))}
            />
          </label>
          <label>
            Discount type
            <select
              value={draft.discount_mode || "fixed"}
              onChange={(e) => set("discount_mode", e.target.value)}
            >
              <option value="fixed">Fixed amount (PKR)</option>
              <option value="percent">Percentage (%)</option>
            </select>
          </label>
          <label>
            Discount
            <input
              type="number"
              min="0"
              value={draft.discount}
              onChange={(e) => set("discount", Number(e.target.value))}
            />
          </label>
          <strong>Total {money(calc.total)}</strong>
        </div>
        <p>
          Card tax applies only to its line item. Invoice tax applies to
          subtotal after discount, excluding card tax and delivery.
        </p>
        <label className="notes">
          Notes
          <textarea
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </label>
        <footer>
          <button onClick={close}>Cancel</button>
          <button
            className="primary"
            disabled={
              !draft.client ||
              !draft.line_items.some((x: Item) => x.description && x.rate >= 0)
            }
            onClick={preview}
          >
            <Eye />
            Review preview
          </button>
        </footer>
      </div>
    </div>
  );
}
function Preview({ draft, calc, back, approve, busy }: any) {
  const [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [banks, setBanks] = useState<any[]>([]);
  useEffect(() => {
    let active = true,
      objectUrl = "";
    Promise.all([
      fetch("/api/invoices/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error);
        return r.blob();
      }),
      fetch("/api/payment-settings").then(async (r) => {
        if (!r.ok) throw new Error("Unable to load payment details");
        return r.json();
      }),
    ])
      .then(([blob, payment]) => {
        objectUrl = URL.createObjectURL(blob);
        if (active) {
          setUrl(objectUrl);
          setBanks(payment.banks);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [draft]);
  const invoice = {
    ...draft,
    invoice_number: "DRAFT - pending approval",
    client_snapshot: draft.client,
    line_items: calculateInvoice(draft).items,
    subtotal: calc.sub,
    discount: calc.discount,
    tax_amount: calc.tax,
    total: calc.total,
  };
  return (
    <div className="overlay">
      <div
        className="modal preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Invoice preview"
      >
        <label>MANDATORY PREVIEW · A5</label>
        <h2>Invoice for {draft.client.company_name}</h2>
        <p>
          Review the details below. The online link and QR are added after
          approval.
        </p>
        {error ? (
          <p role="alert">{error}</p>
        ) : !url ? (
          <p>Preparing A5 preview…</p>
        ) : (
          <>
            <a href={url} target="_blank" rel="noreferrer">
              Open exact A5 PDF preview
            </a>
            <OnlineInvoice invoice={invoice} banks={banks} preview />
          </>
        )}
        <footer>
          <button onClick={back}>Continue editing</button>
          <button
            className="primary"
            disabled={busy || !url || !!error}
            onClick={approve}
          >
            <CircleCheck />
            {busy ? "Generating..." : "Approve & generate"}
          </button>
        </footer>
      </div>
    </div>
  );
}
function CreateClient({ close, done }: any) {
  const [f, setF] = useState({
      contact_name: "",
      company_name: "",
      email: "",
      phone: "",
      address: "",
      ntn: "",
      default_tax: 0,
    }),
    [busy, setBusy] = useState(false),
    [err, setErr] = useState("");
  const save = async () => {
    setBusy(true);
    const r = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    const j = await r.json();
    if (r.ok) done();
    else setErr(j.error);
    setBusy(false);
  };
  return (
    <SmallForm
      title="Add client"
      close={close}
      save={save}
      busy={busy}
      error={err}
    >
      <label>
        Contact name
        <input
          value={f.contact_name}
          onChange={(e) => setF({ ...f, contact_name: e.target.value })}
        />
      </label>
      <label>
        Company
        <input
          value={f.company_name}
          onChange={(e) => setF({ ...f, company_name: e.target.value })}
        />
      </label>
      <label>
        Email
        <input
          type="email"
          value={f.email}
          onChange={(e) => setF({ ...f, email: e.target.value })}
        />
      </label>
      <label>
        WhatsApp
        <input
          value={f.phone}
          onChange={(e) => setF({ ...f, phone: e.target.value })}
        />
      </label>
      <label>
        Address
        <textarea
          value={f.address}
          onChange={(e) => setF({ ...f, address: e.target.value })}
        />
      </label>
      <label>
        NTN
        <input
          value={f.ntn}
          onChange={(e) => setF({ ...f, ntn: e.target.value })}
        />
      </label>
    </SmallForm>
  );
}
function CreateService({ close, done }: any) {
  const [f, setF] = useState({ name: "", description: "", default_rate: 0 }),
    [busy, setBusy] = useState(false),
    [err, setErr] = useState("");
  const save = async () => {
    setBusy(true);
    const r = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    const j = await r.json();
    if (r.ok) done();
    else setErr(j.error);
    setBusy(false);
  };
  return (
    <SmallForm
      title="Add service"
      close={close}
      save={save}
      busy={busy}
      error={err}
    >
      <label>
        Service name
        <input
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
      </label>
      <label>
        Description
        <textarea
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
        />
      </label>
      <label>
        Default rate
        <input
          type="number"
          value={f.default_rate}
          onChange={(e) => setF({ ...f, default_rate: Number(e.target.value) })}
        />
      </label>
    </SmallForm>
  );
}
function SmallForm({ title, close, save, busy, error, children }: any) {
  return (
    <div className="overlay">
      <div className="modal small">
        <button className="close" onClick={close}>
          <X />
        </button>
        <label>CATCORE ACCOUNTS</label>
        <h2>{title}</h2>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="small-grid">{children}</div>
        <footer>
          <button onClick={close}>Cancel</button>
          <button className="primary" onClick={save} disabled={busy}>
            <Send />
            {busy ? "Saving..." : "Save"}
          </button>
        </footer>
      </div>
    </div>
  );
}
