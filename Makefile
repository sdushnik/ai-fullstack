PYTHON ?= python3
VENV := .venv
VENV_PYTHON := $(VENV)/bin/python
DEPENDENCIES := $(VENV)/.backend-dependencies-installed
HOST ?= 127.0.0.1
PORT ?= 8000
FRONTEND_PORT ?= 8080

.PHONY: setup run frontend test

setup: $(DEPENDENCIES)

$(DEPENDENCIES): backend/requirements.txt
	$(PYTHON) -m venv $(VENV)
	$(VENV_PYTHON) -m pip install -r backend/requirements.txt
	touch $(DEPENDENCIES)

run: $(DEPENDENCIES)
	@$(VENV_PYTHON) -c 'import socket, sys; s = socket.socket(); result = s.connect_ex((sys.argv[1], int(sys.argv[2]))); s.close(); sys.exit(result == 0)' $(HOST) $(PORT) || { printf 'Port %s is already in use. If the Replay API is already running, use it as-is; otherwise run on another port with: make run PORT=8001\n' $(PORT); exit 1; }
	cd backend && ../$(VENV_PYTHON) -m uvicorn app.main:app --reload --host $(HOST) --port $(PORT)

frontend:
	cd frontend && BACKEND_URL=http://127.0.0.1:$(PORT) npm run dev -- --host $(HOST) --port $(FRONTEND_PORT)

test: $(DEPENDENCIES)
	cd backend && ../$(VENV_PYTHON) -m pytest
