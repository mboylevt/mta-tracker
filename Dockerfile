# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Python runtime
FROM python:3.11-slim
ENV TZ=America/New_York
RUN apt-get update && apt-get install -y --no-install-recommends tzdata && rm -rf /var/lib/apt/lists/* && ln -sf /usr/share/zoneinfo/$TZ /etc/local time && echo $TZ > /etc/timezone
WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend from stage 1
COPY --from=frontend-build /static ./static/

# Create data directory for dashboard configs
RUN mkdir -p /app/data/configs

EXPOSE 9876

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "9876"]