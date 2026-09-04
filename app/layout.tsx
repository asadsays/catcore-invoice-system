import type { Metadata } from "next";
import "../src/style.css";
export const metadata: Metadata = { title: "Catcore Accounts", description: "Invoices by Catcore Solutions" };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
