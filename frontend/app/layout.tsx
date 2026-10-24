import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chat con tus documentos",
  description: "RAG con LlamaIndex + FastAPI + Next.js",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
