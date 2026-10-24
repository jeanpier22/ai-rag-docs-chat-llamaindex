"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Message, Source } from "@/lib/types";

const SUGGESTIONS = [
  "Resume los documentos en 5 puntos",
  "¿Cuáles son los temas principales?",
  "¿Qué datos o cifras importantes mencionan?",
];

type Props = {
  hasDocuments: boolean;
  messages: Message[];
  asking: boolean;
  onAsk: (question: string) => void;
};

function Sources({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;
  return (
    <details className="sources">
      <summary>📎 Fuentes ({sources.length})</summary>
      {sources.map((src, i) => (
        <div className="source" key={i}>
          <div className="source-meta">
            Fragmento {i + 1}
            {src.file && ` · ${src.file}`}
            {src.page && ` · página ${src.page}`}
            {src.score !== null && ` · relevancia ${src.score.toFixed(2)}`}
          </div>
          <div className="source-text">{src.text}...</div>
        </div>
      ))}
    </details>
  );
}

export function Chat({ hasDocuments, messages, asking, onAsk }: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Bajar automáticamente al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, asking]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || asking) return;
    setInput("");
    onAsk(question);
  }

  return (
    <main className="main">
      <div className="chat">
        <div className="chat-inner">
          <div className="hero">
            <h1>📚 Chat con tus documentos</h1>
            <p>Sube uno o varios archivos y hazles preguntas: las respuestas salen de su contenido.</p>
          </div>

          {!hasDocuments && <div className="empty">👈 Empieza subiendo uno o varios documentos desde la barra lateral.</div>}

          {hasDocuments && messages.length === 0 && (
            <>
              <div>Prueba con alguna de estas preguntas</div>
              <div className="suggestions">
                {SUGGESTIONS.map((q) => (
                  <button key={q} className="suggestion" onClick={() => onAsk(q)} disabled={asking}>
                    {q}
                  </button>
                ))}
              </div>
            </>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role}${m.error ? " error" : ""}`}>
              <div className="avatar">{m.role === "user" ? "🧑" : "🤖"}</div>
              <div className="bubble">
                {m.role === "assistant" ? <ReactMarkdown>{m.content}</ReactMarkdown> : <p>{m.content}</p>}
                {m.sources && <Sources sources={m.sources} />}
              </div>
            </div>
          ))}

          {asking && (
            <div className="message assistant">
              <div className="avatar">🤖</div>
              <div className="bubble status">
                <span className="spinner" /> Buscando en los documentos...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {hasDocuments && (
        <div className="composer">
          <form onSubmit={submit}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta sobre tus documentos..."
              disabled={asking}
            />
            <button type="submit" disabled={asking || !input.trim()}>
              Enviar
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
