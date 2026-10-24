"""API del RAG con LlamaIndex.

Expone la lógica de `rag/rag.py` como endpoints HTTP para que cualquier
frontend (en este proyecto, Next.js en Vercel) pueda usarla. Admite varios
documentos a la vez: las preguntas se responden buscando en todos ellos.
"""

import os
import secrets
import threading

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from pydantic import BaseModel

from app.rag import (
    clear_documents,
    save_document,
    delete_document_file,
    load_file,
    add_documents,
    remove_documents,
    query_index,
)

# ===================== Configuración =====================
# Carpeta backend/ (este archivo está en backend/app/main.py)
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(base_dir, ".env"))

if not os.getenv("OPENAI_API_KEY"):
    raise RuntimeError("Falta la variable OPENAI_API_KEY en backend/.env")

API_KEY = os.getenv("API_KEY")
if not API_KEY:
    raise RuntimeError("Falta la variable API_KEY en backend/.env (clave que exige esta API)")

# Archivos subidos (se guardan solo mientras se leen; el índice vive en memoria)
doc_path = os.path.join(base_dir, "storage", "data")
os.makedirs(doc_path, exist_ok=True)
# La API arranca sin documentos: limpiar restos de una ejecución anterior
clear_documents(doc_path)

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md"}
MAX_FILE_MB = 10
MAX_DOCUMENTS = 10

# Estado en memoria: un solo índice con todos los documentos.
# documents: nombre del archivo -> información + ids de sus partes en el índice
state = {"index": None, "documents": {}}
lock = threading.Lock()

app = FastAPI(title="RAG con LlamaIndex", version="2.0.0")


def require_api_key(x_api_key: str = Header(default="")):
    """Rechaza las peticiones que no traen la clave correcta en la cabecera X-API-Key."""
    if not secrets.compare_digest(x_api_key, API_KEY):
        raise HTTPException(status_code=401, detail="API key inválida")


class QueryRequest(BaseModel):
    question: str


def public_info(doc):
    """Información del documento que se devuelve al frontend (sin ids internos)."""
    return {key: doc[key] for key in ("name", "pages", "chars", "preview")}


def document_list():
    return [public_info(doc) for doc in state["documents"].values()]


def remove_from_index(name):
    """Quita un documento del índice y de disco. Si era el último, vacía el índice."""
    doc = state["documents"].pop(name)
    remove_documents(state["index"], doc["ref_doc_ids"])
    delete_document_file(doc_path, name)
    if not state["documents"]:
        state["index"] = None


# ===================== Endpoints =====================
@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/documents", dependencies=[Depends(require_api_key)])
def list_documents():
    """Lista los documentos cargados."""
    return {"documents": document_list()}


@app.post("/documents", dependencies=[Depends(require_api_key)])
def upload_documents(files: list[UploadFile] = File(...)):
    """Agrega uno o varios documentos al índice.

    Si ya existe un documento con el mismo nombre, se reemplaza.
    """
    with lock:
        for file in files:
            filename = os.path.basename(file.filename or "")
            if os.path.splitext(filename)[1].lower() not in ALLOWED_EXTENSIONS:
                raise HTTPException(status_code=400, detail=f"{filename}: formato no soportado. Usa PDF, TXT o MD.")

            data = file.file.read()
            if not data:
                raise HTTPException(status_code=400, detail=f"{filename}: el archivo está vacío.")
            if len(data) > MAX_FILE_MB * 1024 * 1024:
                raise HTTPException(status_code=413, detail=f"{filename}: supera los {MAX_FILE_MB} MB.")

            if filename in state["documents"]:
                remove_from_index(filename)
            elif len(state["documents"]) >= MAX_DOCUMENTS:
                raise HTTPException(status_code=400, detail=f"Máximo {MAX_DOCUMENTS} documentos a la vez.")

            save_document(doc_path, filename, data)
            documents = load_file(os.path.join(doc_path, filename))
            if not documents:
                delete_document_file(doc_path, filename)
                raise HTTPException(status_code=400, detail=f"{filename}: no se pudo leer su contenido.")

            state["index"] = add_documents(state["index"], documents)
            state["documents"][filename] = {
                "name": filename,
                "pages": len(documents),
                "chars": sum(len(d.text) for d in documents),
                "preview": documents[0].text[:3000],
                "ref_doc_ids": [d.doc_id for d in documents],
            }

    return {"documents": document_list()}


@app.delete("/documents/{name}", dependencies=[Depends(require_api_key)])
def delete_document(name: str):
    """Elimina un documento del índice."""
    with lock:
        if name not in state["documents"]:
            raise HTTPException(status_code=404, detail=f"No existe el documento {name}.")
        remove_from_index(name)
    return {"documents": document_list()}


@app.delete("/documents", dependencies=[Depends(require_api_key)])
def delete_all_documents():
    """Elimina todos los documentos y vacía el índice."""
    with lock:
        clear_documents(doc_path)
        state["index"] = None
        state["documents"] = {}
    return {"documents": []}


@app.post("/query", dependencies=[Depends(require_api_key)])
def query(body: QueryRequest):
    """Responde una pregunta buscando en todos los documentos y devuelve las fuentes usadas."""
    question = body.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="La pregunta está vacía.")

    index = state["index"]
    if index is None:
        raise HTTPException(status_code=409, detail="Primero sube al menos un documento.")

    response = query_index(index, question)
    sources = [
        {
            "file": node.node.metadata.get("file_name"),
            "page": node.node.metadata.get("page_label"),
            "score": node.score,
            "text": node.node.get_content()[:500].strip(),
        }
        for node in response.source_nodes
    ]
    answer = str(response).strip() or "No encontré información sobre eso en los documentos."
    return {"answer": answer, "sources": sources}
