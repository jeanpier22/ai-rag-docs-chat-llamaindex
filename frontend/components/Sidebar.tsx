"use client";

import { useState } from "react";
import type { DocumentInfo } from "@/lib/types";
import { TrashIcon } from "./TrashIcon";

type Props = {
  documents: DocumentInfo[];
  uploadStatus: string | null;
  onUpload: (files: File[]) => void;
  onDeleteClick: (name: string) => void;
  onResetChat: () => void;
};

export function Sidebar({ documents, uploadStatus, onUpload, onDeleteClick, onResetChat }: Props) {
  const [dragging, setDragging] = useState(false);
  const uploading = uploadStatus !== null;

  function pick(files: FileList | null) {
    if (files && files.length && !uploading) onUpload(Array.from(files));
  }

  return (
    <aside className="sidebar">
      <h2>📄 Documentos {documents.length > 0 && <span className="count">({documents.length})</span>}</h2>

      {uploading ? (
        <div className="status">
          <span className="spinner" /> {uploadStatus}
        </div>
      ) : (
        <label
          className={`dropzone${dragging ? " dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files);
          }}
        >
          <strong>{documents.length ? "Agregar más archivos" : "Sube tus archivos"}</strong>
          Arrástralos aquí o haz clic · PDF, TXT o MD
          <input
            type="file"
            accept=".pdf,.txt,.md"
            multiple
            onChange={(e) => {
              pick(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      )}

      {/* Un recuadro por documento, con su botón de eliminar dentro */}
      {documents.map((doc) => (
        <div className="doc-card" key={doc.name}>
          <div className="doc-card-row">
            <div className="doc-card-info">
              <div className="doc-card-name">{doc.name}</div>
              <div className="doc-card-meta">
                {doc.pages} página(s) · {doc.chars.toLocaleString("es")} caracteres
              </div>
            </div>
            <button
              className="icon-btn-danger"
              onClick={() => onDeleteClick(doc.name)}
              disabled={uploading}
              title="Eliminar documento"
              aria-label={`Eliminar ${doc.name}`}
            >
              <TrashIcon />
            </button>
          </div>
          <details>
            <summary>Vista previa del contenido</summary>
            <pre>{doc.preview}</pre>
          </details>
        </div>
      ))}

      {documents.length > 0 && (
        <button className="btn" onClick={onResetChat}>
          🧹 Nueva conversación
        </button>
      )}

      <div className="sidebar-footer">RAG con LlamaIndex · FastAPI · Next.js · Datapath</div>
    </aside>
  );
}
