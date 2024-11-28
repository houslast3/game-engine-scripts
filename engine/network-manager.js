class NetworkManager {
    constructor(engine) {
        this.engine = engine;
        this.ws = null;
        this.serverUrl = 'http://localhost:3000';
        this.wsUrl = 'ws://localhost:8080';
        this.connected = false;
        this.messageQueue = [];
        
        this.setupWebSocket();
    }

    setupWebSocket() {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
            console.log('Conectado ao servidor WebSocket');
            this.connected = true;
            this.processMessageQueue();
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleServerMessage(data);
            } catch (error) {
                console.error('Erro ao processar mensagem do servidor:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('Desconectado do servidor WebSocket');
            this.connected = false;
            // Tentar reconectar após 5 segundos
            setTimeout(() => this.setupWebSocket(), 5000);
        };
    }

    handleServerMessage(data) {
        switch (data.type) {
            case 'save_response':
                this.engine.events.emit('gameSaved', data);
                break;
            case 'physics_update':
                this.engine.physics.syncFromServer(data.state);
                break;
            case 'resource_update':
                this.engine.resourceManager.syncFromServer(data.resources);
                break;
        }
    }

    async saveGame(gameState) {
        if (!this.connected) {
            this.messageQueue.push({
                type: 'save_game',
                data: gameState
            });
            return;
        }

        this.ws.send(JSON.stringify({
            type: 'save_game',
            data: gameState
        }));
    }

    async exportGame(gameData) {
        try {
            const response = await fetch(`${this.serverUrl}/api/export-game`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gameData)
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao exportar jogo:', error);
            return { success: false, error: error.message };
        }
    }

    async saveResource(resource) {
        try {
            const response = await fetch(`${this.serverUrl}/api/save-resource`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(resource)
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao salvar recurso:', error);
            return { success: false, error: error.message };
        }
    }

    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.ws.send(JSON.stringify(message));
        }
    }
}

// Adiciona ao objeto window para acesso global
window.NetworkManager = NetworkManager;
