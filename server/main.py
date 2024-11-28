from fastapi import FastAPI, WebSocket, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio
from typing import Dict, List
import os
from datetime import datetime
import logging

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configuração CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir arquivos estáticos
app.mount("/", StaticFiles(directory="../", html=True), name="static")

# Armazenamento em memória (em produção, use um banco de dados)
games = {}
resources = {}
connected_clients: List[WebSocket] = []

# Gerenciador de conexões WebSocket
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"Cliente conectado. Total de conexões: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"Cliente desconectado. Total de conexões: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Erro ao enviar mensagem: {e}")

manager = ConnectionManager()

# Rotas WebSocket
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            
            # Processa diferentes tipos de mensagens
            if data["type"] == "save_game":
                game_data = data["data"]
                game_id = game_data.get("id", str(datetime.now().timestamp()))
                games[game_id] = game_data
                await websocket.send_json({
                    "type": "save_response",
                    "success": True,
                    "message": "Jogo salvo com sucesso",
                    "game_id": game_id
                })
            
            elif data["type"] == "sync_physics":
                # Broadcast da atualização de física para todos os clientes
                await manager.broadcast({
                    "type": "physics_update",
                    "state": data["state"]
                })

    except Exception as e:
        logger.error(f"Erro na conexão WebSocket: {e}")
    finally:
        manager.disconnect(websocket)

# Rotas API REST
@app.post("/api/export-game")
async def export_game(request: Request):
    try:
        game_data = await request.json()
        game_id = str(datetime.now().timestamp())
        
        # Salva o jogo (em produção, use um sistema de arquivos ou banco de dados)
        games[game_id] = game_data
        
        return JSONResponse({
            "success": True,
            "message": "Jogo exportado com sucesso",
            "game_id": game_id
        })
    except Exception as e:
        logger.error(f"Erro ao exportar jogo: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/save-resource")
async def save_resource(request: Request):
    try:
        resource_data = await request.json()
        resource_id = resource_data.get("id", str(datetime.now().timestamp()))
        
        # Salva o recurso
        resources[resource_id] = resource_data
        
        # Notifica todos os clientes sobre o novo recurso
        await manager.broadcast({
            "type": "resource_update",
            "resources": resources
        })
        
        return JSONResponse({
            "success": True,
            "message": "Recurso salvo com sucesso",
            "resource_id": resource_id
        })
    except Exception as e:
        logger.error(f"Erro ao salvar recurso: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/load-resources")
async def load_resources():
    try:
        return JSONResponse({
            "success": True,
            "resources": resources
        })
    except Exception as e:
        logger.error(f"Erro ao carregar recursos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Middleware para logging de requisições
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Requisição recebida: {request.method} {request.url}")
    response = await call_next(request)
    return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True)
