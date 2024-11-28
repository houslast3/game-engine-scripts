class Console {
    constructor(engine) {
        this.engine = engine;
        this.container = document.getElementById('console-content');
        this.messages = [];
        this.maxMessages = 100;
        
        // Estiliza o container
        this.container.style.fontFamily = 'monospace';
        this.container.style.fontSize = '12px';
        this.container.style.lineHeight = '1.4';
        this.container.style.whiteSpace = 'pre-wrap';
        this.container.style.overflow = 'auto';
        
        // Registra no motor
        this.engine.console = this;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const formattedMessage = `[${timestamp}] ${message}`;
        
        // Cria o elemento da mensagem
        const messageElement = document.createElement('div');
        messageElement.textContent = formattedMessage;
        messageElement.className = `console-message ${type}`;
        
        // Estiliza baseado no tipo
        switch (type) {
            case 'error':
                messageElement.style.color = '#ff5555';
                break;
            case 'warn':
                messageElement.style.color = '#ffaa55';
                break;
            case 'info':
                messageElement.style.color = '#55ff55';
                break;
            default:
                messageElement.style.color = '#ffffff';
        }
        
        // Adiciona a mensagem
        this.container.appendChild(messageElement);
        this.messages.push({
            type,
            message: formattedMessage,
            element: messageElement
        });
        
        // Limita o número de mensagens
        if (this.messages.length > this.maxMessages) {
            const oldestMessage = this.messages.shift();
            this.container.removeChild(oldestMessage.element);
        }
        
        // Rola para a última mensagem
        this.container.scrollTop = this.container.scrollHeight;
        
        // Também loga no console do navegador
        console[type === 'info' ? 'log' : type](message);
    }

    error(message) {
        this.log(message, 'error');
    }

    warn(message) {
        this.log(message, 'warn');
    }

    info(message) {
        this.log(message, 'info');
    }

    clear() {
        this.container.innerHTML = '';
        this.messages = [];
    }

    update() {
        // Atualização futura se necessário
    }
}

// Exporta a classe
window.Console = Console;
