"use client";
export default function ErrorView({ reset }: { reset: () => void }) {
  return (
    <div className="online-invoice">
      <h1>Invoice temporarily unavailable</h1>
      <p>Please try again, or contact info@catcoresolutions.com.</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
