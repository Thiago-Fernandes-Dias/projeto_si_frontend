SHELL := /bin/bash
IMAGE_NAME := keystroke-auth-frontend
CONTAINER_PORT := 80
HOST_PORT := 4200

.PHONY: help install dev build test lint docker-build docker-run docker-dev compose-up compose-down clean

help:
	@echo "Comandos disponíveis:"
	@echo "  make install       - Instala dependências do projeto via npm"
	@echo "  make dev           - Executa o servidor de desenvolvimento Angular (localhost:4200)"
	@echo "  make build         - Executa o build de produção do Angular"
	@echo "  make test          - Executa a suíte de testes unitários automatizados"
	@echo "  make docker-build  - Constrói a imagem Docker de produção"
	@echo "  make docker-run    - Executa o container Docker em http://localhost:$(HOST_PORT)"
	@echo "  make docker-dev    - Executa o ambiente de desenvolvimento em container Docker"
	@echo "  make compose-up    - Constrói e inicia o container frontend via Docker Compose"
	@echo "  make compose-down  - Encerra os containers orquestrados via Docker Compose"
	@echo "  make clean         - Limpa a pasta dist e caches de build"

install:
	npm install

dev:
	NG_CLI_ANALYTICS=false npm start

build:
	NG_CLI_ANALYTICS=false npm run build -- --configuration production

test:
	NG_CLI_ANALYTICS=false npm test -- --watch=false --browsers=ChromeHeadless

docker-build:
	docker build -t $(IMAGE_NAME) .

docker-run:
	docker run --rm -p $(HOST_PORT):$(CONTAINER_PORT) --name $(IMAGE_NAME)-instance $(IMAGE_NAME)

docker-dev:
	docker run -it --rm -p 4200:4200 -v $(PWD):/app -w /app node:22-alpine sh -c "npm install && npm start -- --host 0.0.0.0"

compose-up:
	docker compose up --build

compose-down:
	docker compose down

clean:
	rm -rf dist .angular
