class ResourceManager {
    constructor(engine) {
        this.engine = engine;
        this.resources = {
            images: new Map(),
            audio: new Map(),
            fonts: new Map(),
            shaders: new Map(),
            data: new Map()
        };
        this.loadingQueue = new Map();
        this.cache = new Map();
        this.maxCacheSize = 512 * 1024 * 1024; // 512MB
        this.currentCacheSize = 0;
    }

    async loadResource(type, id, source, options = {}) {
        try {
            // Verifica se já está carregado
            if (this.resources[type].has(id)) {
                return this.resources[type].get(id);
            }

            // Verifica se já está na fila de carregamento
            if (this.loadingQueue.has(id)) {
                return this.loadingQueue.get(id);
            }

            // Cria uma promise para o carregamento
            const loadingPromise = this._loadResourceByType(type, source, options);
            this.loadingQueue.set(id, loadingPromise);

            // Aguarda o carregamento
            const resource = await loadingPromise;
            
            // Remove da fila e adiciona aos recursos
            this.loadingQueue.delete(id);
            this.resources[type].set(id, resource);

            // Adiciona ao cache se necessário
            if (options.cache) {
                this.addToCache(id, resource);
            }

            // Emite evento de carregamento
            this.engine.events.emit('resourceLoaded', { type, id });

            return resource;
        } catch (error) {
            console.error(`Erro ao carregar recurso ${id}:`, error);
            this.engine.events.emit('resourceError', { type, id, error });
            throw error;
        }
    }

    async _loadResourceByType(type, source, options) {
        switch (type) {
            case 'images':
                return this._loadImage(source);
            case 'audio':
                return this._loadAudio(source);
            case 'fonts':
                return this._loadFont(source, options);
            case 'shaders':
                return this._loadShader(source);
            case 'data':
                return this._loadData(source);
            default:
                throw new Error(`Tipo de recurso desconhecido: ${type}`);
        }
    }

    async _loadImage(source) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = source;
        });
    }

    async _loadAudio(source) {
        const response = await fetch(source);
        const arrayBuffer = await response.arrayBuffer();
        return this.engine.audio.context.decodeAudioData(arrayBuffer);
    }

    async _loadFont(source, options) {
        const font = new FontFace(options.family, `url(${source})`, options);
        await font.load();
        document.fonts.add(font);
        return font;
    }

    async _loadShader(source) {
        const response = await fetch(source);
        return response.text();
    }

    async _loadData(source) {
        const response = await fetch(source);
        return response.json();
    }

    getResource(type, id) {
        return this.resources[type].get(id);
    }

    hasResource(type, id) {
        return this.resources[type].has(id);
    }

    removeResource(type, id) {
        const resource = this.resources[type].get(id);
        if (resource) {
            this.resources[type].delete(id);
            this.cache.delete(id);
            this.engine.events.emit('resourceRemoved', { type, id });
            return true;
        }
        return false;
    }

    clearResources(type) {
        if (type) {
            this.resources[type].clear();
            this.engine.events.emit('resourcesCleared', { type });
        } else {
            for (const type in this.resources) {
                this.resources[type].clear();
            }
            this.cache.clear();
            this.currentCacheSize = 0;
            this.engine.events.emit('resourcesCleared', { type: 'all' });
        }
    }

    addToCache(id, resource) {
        const size = this.getResourceSize(resource);
        
        // Verifica se precisa liberar espaço
        while (this.currentCacheSize + size > this.maxCacheSize) {
            const oldestId = this.cache.keys().next().value;
            if (!oldestId) break;
            
            const oldResource = this.cache.get(oldestId);
            this.currentCacheSize -= this.getResourceSize(oldResource);
            this.cache.delete(oldestId);
        }
        
        // Adiciona ao cache
        this.cache.set(id, resource);
        this.currentCacheSize += size;
    }

    getResourceSize(resource) {
        if (resource instanceof Image) {
            return resource.width * resource.height * 4; // RGBA
        } else if (resource instanceof AudioBuffer) {
            return resource.length * resource.numberOfChannels * 4; // 32-bit float
        } else if (resource instanceof FontFace) {
            return 1024 * 1024; // Estimativa de 1MB
        } else if (typeof resource === 'string') {
            return resource.length * 2; // UTF-16
        } else if (resource instanceof ArrayBuffer) {
            return resource.byteLength;
        } else {
            return 1024; // Tamanho padrão para outros tipos
        }
    }

    getCacheSize() {
        return this.currentCacheSize;
    }

    getCacheUsage() {
        return this.currentCacheSize / this.maxCacheSize;
    }

    setMaxCacheSize(size) {
        this.maxCacheSize = size;
        this.engine.events.emit('cacheSizeChanged', size);
    }
}

// Exporta a classe
window.ResourceManager = ResourceManager;
