FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /usr/src/app

# Instalar dependencias primero (Docker reutiliza esta capa si no cambian)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código y la configuración (NO el .env ni storage/)
COPY app ./app
COPY config ./config

# Cloud Run indica el puerto en la variable PORT (por defecto 8080)
EXPOSE 8080
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
