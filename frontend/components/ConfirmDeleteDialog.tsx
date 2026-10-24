"use client";

import { useEffect } from "react";
import { TrashIcon } from "./TrashIcon";

type Props = {
  docName: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDeleteDialog({ docName, deleting, onCancel, onConfirm }: Props) {
  // Cerrar con la tecla Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !deleting && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleting, onCancel]);

  return (
    <div className="overlay" onClick={() => !deleting && onCancel()}>
      <div className="dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>Eliminar documento</h3>
        <p>
          ¿Eliminar <strong>{docName}</strong>?
        </p>
        <p className="muted">
          Se quitará del índice y las próximas respuestas ya no usarán su contenido. No se puede deshacer.
        </p>
        <div className="dialog-actions">
          <button className="btn" onClick={onCancel} disabled={deleting}>
            Cancelar
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={deleting}>
            <TrashIcon size={16} /> {deleting ? "Eliminando..." : "Sí, eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
