SHELL := /bin/bash
IMAGE_NAME := keystroke-auth-frontend
CONTAINER_PORT := 80
HOST_PORT := 4200

.PHONY: help install dev build test lint docker-build docker-run docker-dev mock-install mock-dev mock-test clean

help:
	@echo "Comandos disponíveis:"
	@echo "  make install       - Instala dependências do projeto via npm"
	@echo "  make dev           - Executa o servidor de desenvolvimento Angular (localhost:4200)"
	@echo "  make build         - Executa o build de produção do Angular"
	@echo "  make test          - Executa a suíte de testes unitários automatizados"
	@echo "  make mock-install  - Instala dependências Python da Mock API (Flask)"
	@echo "  make mock-dev      - Inicia a Mock API em Python/Flask na porta 5000"
	@echo "  make mock-test     - Executa os testes automatizados da Mock API"
	@echo "  make docker-build  - Constrói a imagem Docker de produção"
	@echo "  make docker-run    - Executa o container Docker em http://localhost:$(HOST_PORT)"
	@echo "  make docker-dev    - Executa o ambiente de desenvolvimento em container Docker"
	@echo "  make clean         - Limpa a pasta dist e caches de build"

install:
	npm install

dev:
	NG_CLI_ANALYTICS=false npm start

build:
	NG_CLI_ANALYTICS=false npm run build -- --configuration production

test:
	NG_CLI_ANALYTICS=false npm test -- --watch=false --browsers=ChromeHeadless

mock-install:
	pip3 install -r mock_api/requirements.txt

mock-dev:
	python3 mock_api/app.py

mock-test:
	python3 mock_api/test_app.py

docker-build:
	docker build -t $(IMAGE_NAME) .

docker-run:
	docker run --rm -p $(HOST_PORT):$(CONTAINER_PORT) --name $(IMAGE_NAME)-instance $(IMAGE_NAME)

docker-dev:
	docker run -it --rm -p 4200:4200 -v $(PWD):/app -w /app node:22-alpine sh -c "npm install && npm start -- --host 0.0.0.0"

clean:
	rm -rf dist .angular
