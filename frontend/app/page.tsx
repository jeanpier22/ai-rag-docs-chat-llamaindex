"use client";

import { useEffect, useState } from "react";
import { Chat } from "@/components/Chat";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Sidebar } from "@/components/Sidebar";
import { errorMessage, type DocumentInfo, type Message } from "@/lib/types";

type Toast = { text: string; error?: boolean } | null;

export default function Home() {
  // La app arranca sin documentos cargados
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Se sube un archivo por petición: Vercel limita cada petición a ~4.5 MB
  async function upload(files: File[]) {
    const failed: string[] = [];
    for (const [i, file] of files.entries()) {
      setUploadStatus(
        files.length > 1 ? `Procesando ${i + 1} de ${files.length}: ${file.name}` : `Procesando ${file.name}...`,
      );
      try {
        const form = new FormData();
        form.append("files", file);
        const res = await fetch("/api/documents", { method: "POST", body: form });
        if (!res.ok) throw new Error(await errorMessage(res));
        const body = await res.json();
        setDocuments(body.documents);
      } catch (e) {
        failed.push(`${file.name} (${(e as Error).message})`);
      }
    }
    setUploadStatus(null);

    if (failed.length) {
      setToast({ text: `No se pudo subir: ${failed.join(", ")}`, error: true });
    } else {
      setToast({ text: files.length > 1 ? `${files.length} documentos listos ✅` : "Documento listo ✅" });
    }
  }

  async function deleteDocument() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(toDelete)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await errorMessage(res));
      const body = await res.json();
      setDocuments(body.documents);
      if (!body.documents.length) setMessages([]);
      setToDelete(null);
      setToast({ text: "Documento eliminado 🗑️" });
    } catch (e) {
      setToast({ text: `No se pudo eliminar: ${(e as Error).message}`, error: true });
    } finally {
      setDeleting(false);
    }
  }

  async function ask(question: string) {
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setAsking(true);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error(await errorMessage(res));
      const body = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: body.answer, sources: body.sources }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ Ocurrió un error: ${(e as Error).message}`, error: true },
      ]);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="app">
      <Sidebar
        documents={documents}
        uploadStatus={uploadStatus}
        onUpload={upload}
        onDeleteClick={setToDelete}
        onResetChat={() => setMessages([])}
      />
      <Chat hasDocuments={documents.length > 0} messages={messages} asking={asking} onAsk={ask} />

      {toDelete && (
        <ConfirmDeleteDialog
          docName={toDelete}
          deleting={deleting}
          onCancel={() => setToDelete(null)}
          onConfirm={deleteDocument}
        />
      )}

      {toast && <div className={`toast${toast.error ? " error" : ""}`}>{toast.text}</div>}
    </div>
  );
}
