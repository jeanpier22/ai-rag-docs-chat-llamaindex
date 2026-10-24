"""Sistema RAG (Retrieval-Augmented Generation) con LlamaIndex.

Este módulo concentra toda la lógica del RAG separada de la interfaz:
carga de documentos, generación de embeddings, índice vectorial con
varios documentos (agregar y quitar) y consulta.
"""

import os

import yaml
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI
from llama_index.readers.file import PDFReader

# ===================== Configuración del modelo (model_config.yaml) =====================
# backend/config/model_config.yaml (este archivo está en backend/app/rag/rag.py)
_MODEL_CONFIG_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "config",
    "model_config.yaml",
)

with open(_MODEL_CONFIG_PATH, "r", encoding="utf-8") as _f:
    _MODEL_CONFIG = yaml.safe_load(_f)

_LLM_CONFIG = _MODEL_CONFIG["llm"]
_EMBEDDING_CONFIG = _MODEL_CONFIG["embedding"]


def clear_documents(doc_path):
    """Elimina todos los documentos existentes en la carpeta de datos."""
    for doc_file in os.listdir(doc_path):
        os.remove(os.path.join(doc_path, doc_file))


def save_document(doc_path, filename, data):
    """Guarda un documento nuevo (en bytes) dentro de la carpeta de datos."""
    with open(os.path.join(doc_path, filename), "wb") as f:
        f.write(data)


def delete_document_file(doc_path, filename):
    """Elimina un único documento de la carpeta de datos."""
    path = os.path.join(doc_path, filename)
    if os.path.exists(path):
        os.remove(path)


# ===================== Paso 1: Carga de Documentos (Document Loaders) =====================
def load_file(file_path):
    """Carga un único archivo. Un PDF devuelve un Document por página."""
    loader = SimpleDirectoryReader(
        input_files=[file_path],
        file_extractor={".pdf": PDFReader()},
    )
    return loader.load_data()


# ===================== Paso 2: Chunking (División en Fragmentos) =====================
def build_node_parser(chunk_size=512, chunk_overlap=100):
    """Configura el divisor de texto que fragmenta los documentos en nodos."""
    return SentenceSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)


# ===================== Paso 3: Conversión en Embeddings =====================
def build_index(
    documents,
    model=_LLM_CONFIG["model"],
    temperature=_LLM_CONFIG["temperature"],
    embed_model_name=_EMBEDDING_CONFIG["model"],
    chunk_size=512,
    chunk_overlap=100,
):
    """Crea el índice vectorial a partir de los documentos."""
    llm = OpenAI(model=model, temperature=temperature)
    embed_model = OpenAIEmbedding(model=embed_model_name)
    node_parser = build_node_parser(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    return VectorStoreIndex.from_documents(
        documents,
        llm=llm,
        embed_model=embed_model,
        transformations=[node_parser],
    )


# ===================== Paso 4: Agregar y quitar documentos del Índice =====================
def add_documents(index, documents):
    """Agrega documentos a un índice existente, o crea el índice si aún no hay.

    Solo se generan embeddings de los documentos nuevos: los que ya estaban
    en el índice no se vuelven a procesar. `insert` reutiliza el mismo
    chunking y modelo de embeddings con los que se creó el índice.
    """
    if index is None:
        return build_index(documents)
    for document in documents:
        index.insert(document)
    return index


def remove_documents(index, ref_doc_ids):
    """Quita del índice los fragmentos que pertenecen a los documentos indicados."""
    for ref_doc_id in ref_doc_ids:
        index.delete_ref_doc(ref_doc_id, delete_from_docstore=True)


def query_index(
    index,
    prompt,
    model=_LLM_CONFIG["model"],
    temperature=_LLM_CONFIG["temperature"],
):
    """Ejecuta una consulta contra el índice y devuelve la respuesta."""
    # Pasar el LLM explícitamente: sin él, LlamaIndex usa su modelo por defecto
    # (gpt-3.5-turbo), que OpenAI ya retiró.
    llm = OpenAI(model=model, temperature=temperature)
    return index.as_query_engine(llm=llm).query(prompt)
