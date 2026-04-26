FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PRYWATNY_PORTFEL_DATA_ROOT=/data

WORKDIR /app
COPY . /app

RUN mkdir -p /data

EXPOSE 8080

CMD ["sh", "-c", "python -m backend.server --host 0.0.0.0 --port ${PORT:-8080} --data-root ${PRYWATNY_PORTFEL_DATA_ROOT:-/data}"]
