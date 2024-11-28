// Core da Engine
class GameEngine {
    constructor() {
        // Sistemas principais
        this.renderer = null;
        this.physics = null;
        this.input = null;
        this.audio = null;
        this.scene = null;
        this.spriteManager = null;
        this.animation = null;
        
        // Estado do jogo
        this.scenes = new Map();
        this.currentScene = null;
        this.gameObjects = [];
        this.isRunning = false;
        this.isPaused = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        
        // Configurações
        this.config = {
            fps: 60,
            debug: false,
            gravity: 9.8,
            pixelsPerMeter: 100,
            audio: {
                enabled: true,
                masterVolume: 1.0,
                soundVolume: 1.0,
                musicVolume: 1.0
            }
        };
        
        // Eventos
        this.events = new EventEmitter();
        
        // Sistemas de suporte
        this.saveSystem = null;
        this.resourceManager = null;
        this.previewSystem = null;
        this.gameExporter = null;
        
        // Inicialização
        this.init();
    }

    async init() {
        try {
            // Inicializa sistemas principais
            this.renderer = new Renderer(this);
            this.physics = new Physics(this);
            this.input = new Input(this);
            this.audio = new Audio(this);
            this.scene = new Scene(this);
            this.spriteManager = new SpriteManager(this);
            this.animation = new Animation(this);
            
            // Inicializa sistemas de suporte
            this.saveSystem = new SaveSystem(this);
            this.resourceManager = new ResourceManager(this);
            this.previewSystem = new PreviewSystem(this);
            this.gameExporter = new GameExporter(this);
            
            // Configura eventos
            this.setupEvents();
            
            // Inicia o loop principal
            this.startGameLoop();
            
            // Emite evento de inicialização completa
            this.events.emit('engineReady');
        } catch (error) {
            console.error('Erro ao inicializar a engine:', error);
            this.events.emit('engineError', error);
        }
    }

    setupEvents() {
        // Eventos do ciclo de vida
        this.events.on('start', () => this.start());
        this.events.on('stop', () => this.stop());
        this.events.on('pause', () => this.pause());
        this.events.on('resume', () => this.resume());
        
        // Eventos de cena
        this.events.on('sceneLoaded', (scene) => {
            this.currentScene = scene;
            if (scene.onEnter) scene.onEnter();
        });
        
        // Eventos de debug
        this.events.on('toggleDebug', () => {
            this.config.debug = !this.config.debug;
        });
        
        // Eventos de áudio
        this.events.on('volumeChanged', ({ type, value }) => {
            switch (type) {
                case 'master':
                    this.config.audio.masterVolume = value;
                    break;
                case 'sound':
                    this.config.audio.soundVolume = value;
                    break;
                case 'music':
                    this.config.audio.musicVolume = value;
                    break;
            }
        });
    }

    startGameLoop() {
        const loop = (currentTime) => {
            if (!this.lastTime) this.lastTime = currentTime;
            this.deltaTime = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;

            if (this.isRunning && !this.isPaused) {
                this.update();
                this.render();
            }

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }

    update() {
        // Atualiza sistemas
        this.input.update(this.deltaTime);
        this.physics.update(this.deltaTime);
        this.animation.update(this.deltaTime);
        
        // Atualiza cena atual
        if (this.currentScene) {
            this.currentScene.update(this.deltaTime);
        }
        
        // Atualiza objetos
        this.gameObjects.forEach(obj => {
            if (obj.update) obj.update(this.deltaTime);
        });
        
        // Emite evento de atualização
        this.events.emit('update', this.deltaTime);
    }

    render() {
        // Limpa o canvas
        this.renderer.clear();
        
        // Renderiza cena atual
        if (this.currentScene) {
            this.currentScene.render();
        }
        
        // Renderiza objetos
        this.gameObjects.forEach(obj => {
            if (obj.render) obj.render(this.renderer);
        });
        
        // Renderiza debug info se necessário
        if (this.config.debug) {
            this.renderDebugInfo();
        }
        
        // Emite evento de renderização
        this.events.emit('render');
    }

    renderDebugInfo() {
        const info = {
            fps: Math.round(1 / this.deltaTime),
            objects: this.gameObjects.length,
            scene: this.currentScene ? this.currentScene.name : 'none',
            audio: {
                enabled: this.config.audio.enabled,
                master: Math.round(this.config.audio.masterVolume * 100) + '%',
                sound: Math.round(this.config.audio.soundVolume * 100) + '%',
                music: Math.round(this.config.audio.musicVolume * 100) + '%'
            }
        };
        
        this.renderer.drawDebugInfo(info);
    }

    // API Pública
    start() {
        this.isRunning = true;
        this.events.emit('gameStarted');
    }

    stop() {
        this.isRunning = false;
        this.events.emit('gameStopped');
    }

    pause() {
        this.isPaused = true;
        this.audio.pauseAll();
        this.events.emit('gamePaused');
    }

    resume() {
        this.isPaused = false;
        this.audio.resumeAll();
        this.events.emit('gameResumed');
    }

    addGameObject(gameObject) {
        this.gameObjects.push(gameObject);
        if (gameObject.onAdd) gameObject.onAdd(this);
        this.events.emit('objectAdded', gameObject);
    }

    removeGameObject(gameObject) {
        const index = this.gameObjects.indexOf(gameObject);
        if (index !== -1) {
            if (gameObject.onRemove) gameObject.onRemove(this);
            this.gameObjects.splice(index, 1);
            this.events.emit('objectRemoved', gameObject);
        }
    }

    setConfig(config) {
        Object.assign(this.config, config);
        
        // Atualiza configurações de áudio
        if (config.audio) {
            if (config.audio.enabled !== undefined) {
                this.config.audio.enabled = config.audio.enabled;
            }
            if (config.audio.masterVolume !== undefined) {
                this.audio.setMasterVolume(config.audio.masterVolume);
            }
            if (config.audio.soundVolume !== undefined) {
                this.audio.setSoundVolume(config.audio.soundVolume);
            }
            if (config.audio.musicVolume !== undefined) {
                this.audio.setMusicVolume(config.audio.musicVolume);
            }
        }
        
        this.events.emit('configChanged', this.config);
    }
}

// Sistema de Eventos Simples
class EventEmitter {
    constructor() {
        this.events = new Map();
    }

    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    }

    off(event, callback) {
        if (!this.events.has(event)) return;
        
        const callbacks = this.events.get(event);
        const index = callbacks.indexOf(callback);
        
        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    }

    emit(event, ...args) {
        if (!this.events.has(event)) return;
        
        const callbacks = this.events.get(event);
        callbacks.forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                console.error(`Erro ao executar callback do evento ${event}:`, error);
            }
        });
    }
}

// Exporta a engine
window.GameEngine = GameEngine;
