PYTHON ?= python3.12
BACKEND_DIR := backend
FRONTEND_DIR := frontend

.PHONY: install seed run dev test build docker-up docker-down clean lint

install:
	$(PYTHON) -m pip install -r $(BACKEND_DIR)/requirements.txt
	cd $(FRONTEND_DIR) && npm ci

seed:
	cd $(BACKEND_DIR) && $(PYTHON) -m app.seed

run:
	cd $(BACKEND_DIR) && $(PYTHON) -m uvicorn app.main:app --host 0.0.0.0 --port 8000

dev:
	@echo "Starting backend on :8000 and Vite on :5173; use Ctrl+C to stop both."
	@(cd $(BACKEND_DIR) && $(PYTHON) -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000) & api_pid=$$!; \
	trap 'kill $$api_pid 2>/dev/null || true' EXIT INT TERM; \
	cd $(FRONTEND_DIR) && npm run dev -- --host 0.0.0.0 --port 5173

test:
	cd $(BACKEND_DIR) && $(PYTHON) -m pytest tests

build:
	cd $(FRONTEND_DIR) && npm run build

docker-up:
	docker compose up --build

docker-down:
	docker compose down

clean:
	rm -rf $(FRONTEND_DIR)/dist $(FRONTEND_DIR)/node_modules $(BACKEND_DIR)/.pytest_cache
	find $(BACKEND_DIR) -type d -name __pycache__ -prune -exec rm -rf {} +

lint:
	cd $(FRONTEND_DIR) && npm run lint
