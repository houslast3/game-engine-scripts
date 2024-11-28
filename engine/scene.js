class Scene {
    constructor(engine) {
        this.engine = engine;
        this.gameObjects = new Map();
        this.layers = new Map();
        this.isActive = false;
        this.isPaused = false;
        
        // Sistemas da cena
        this.physics = engine.physics;
        this.renderer = engine.renderer;
        this.input = engine.input;
        this.audio = engine.audio;
        
        this.setupDefaultLayers();
    }

    setupDefaultLayers() {
        // Cria camadas padrão
        this.createLayer('background', -10);
        this.createLayer('default', 0);
        this.createLayer('foreground', 10);
        this.createLayer('ui', 100);
    }

    createLayer(name, zIndex) {
        this.layers.set(name, {
            name,
            zIndex,
            objects: new Set()
        });
    }

    addToLayer(gameObject, layerName = 'default') {
        const layer = this.layers.get(layerName);
        if (layer) {
            layer.objects.add(gameObject);
            gameObject.layer = layerName;
        }
    }

    removeFromLayer(gameObject) {
        if (gameObject.layer) {
            const layer = this.layers.get(gameObject.layer);
            if (layer) {
                layer.objects.delete(gameObject);
            }
            gameObject.layer = null;
        }
    }

    // Gerenciamento de objetos
    addGameObject(gameObject, layerName = 'default') {
        this.gameObjects.set(gameObject.id, gameObject);
        this.addToLayer(gameObject, layerName);
        
        if (gameObject.onAdd) {
            gameObject.onAdd(this);
        }

        // Adiciona ao sistema de física se necessário
        if (gameObject.rigidbody) {
            this.physics.addBody(gameObject);
        }
    }

    removeGameObject(gameObject) {
        this.gameObjects.delete(gameObject.id);
        this.removeFromLayer(gameObject);
        
        if (gameObject.onRemove) {
            gameObject.onRemove(this);
        }

        // Remove do sistema de física se necessário
        if (gameObject.rigidbody) {
            this.physics.removeBody(gameObject);
        }
    }

    // Ciclo de vida da cena
    onEnter() {
        this.isActive = true;
        this.isPaused = false;
        
        // Inicializa todos os objetos
        for (const obj of this.gameObjects.values()) {
            if (obj.onSceneEnter) {
                obj.onSceneEnter();
            }
        }
    }

    onExit() {
        this.isActive = false;
        
        // Finaliza todos os objetos
        for (const obj of this.gameObjects.values()) {
            if (obj.onSceneExit) {
                obj.onSceneExit();
            }
        }
    }

    pause() {
        if (!this.isPaused) {
            this.isPaused = true;
            for (const obj of this.gameObjects.values()) {
                if (obj.onScenePause) {
                    obj.onScenePause();
                }
            }
        }
    }

    resume() {
        if (this.isPaused) {
            this.isPaused = false;
            for (const obj of this.gameObjects.values()) {
                if (obj.onSceneResume) {
                    obj.onSceneResume();
                }
            }
        }
    }

    // Loop principal
    update(deltaTime) {
        if (!this.isActive || this.isPaused) return;

        // Atualiza todos os objetos em ordem de layer
        const sortedLayers = Array.from(this.layers.values())
            .sort((a, b) => a.zIndex - b.zIndex);

        for (const layer of sortedLayers) {
            for (const obj of layer.objects) {
                if (obj.update) {
                    obj.update(deltaTime);
                }
            }
        }
    }

    render(ctx) {
        if (!this.isActive) return;

        // Renderiza todos os objetos em ordem de layer
        const sortedLayers = Array.from(this.layers.values())
            .sort((a, b) => a.zIndex - b.zIndex);

        for (const layer of sortedLayers) {
            for (const obj of layer.objects) {
                if (obj.render) {
                    obj.render(ctx);
                }
            }
        }
    }

    // Utilitários
    findGameObjectById(id) {
        return this.gameObjects.get(id);
    }

    findGameObjectsByTag(tag) {
        return Array.from(this.gameObjects.values())
            .filter(obj => obj.tags && obj.tags.includes(tag));
    }

    findGameObjectsByType(type) {
        return Array.from(this.gameObjects.values())
            .filter(obj => obj instanceof type);
    }

    getAllGameObjects() {
        return Array.from(this.gameObjects.values());
    }

    getGameObjectsInLayer(layerName) {
        const layer = this.layers.get(layerName);
        return layer ? Array.from(layer.objects) : [];
    }

    // Limpeza
    clear() {
        // Remove todos os objetos
        for (const obj of this.gameObjects.values()) {
            this.removeGameObject(obj);
        }

        // Limpa as camadas
        for (const layer of this.layers.values()) {
            layer.objects.clear();
        }
    }
}

// Sistema de Gerenciamento de Cenas
class SceneManager {
    constructor(engine) {
        this.engine = engine;
        this.scenes = new Map();
        this.currentScene = null;
        this.nextScene = null;
        this.isTransitioning = false;
        this.transitionDuration = 0;
        this.transitionTimer = 0;
        this.transitionCallback = null;
    }

    addScene(name, scene) {
        this.scenes.set(name, scene);
    }

    loadScene(name, transitionDuration = 0) {
        const nextScene = this.scenes.get(name);
        if (!nextScene) return false;

        if (transitionDuration > 0) {
            this.startTransition(nextScene, transitionDuration);
        } else {
            this.changeScene(nextScene);
        }

        return true;
    }

    startTransition(nextScene, duration) {
        this.isTransitioning = true;
        this.transitionDuration = duration;
        this.transitionTimer = 0;
        this.nextScene = nextScene;
    }

    changeScene(newScene) {
        if (this.currentScene) {
            this.currentScene.onExit();
        }

        this.currentScene = newScene;
        this.currentScene.onEnter();
    }

    update(deltaTime) {
        if (this.isTransitioning) {
            this.transitionTimer += deltaTime;
            
            if (this.transitionTimer >= this.transitionDuration) {
                this.changeScene(this.nextScene);
                this.isTransitioning = false;
                this.nextScene = null;
                if (this.transitionCallback) {
                    this.transitionCallback();
                    this.transitionCallback = null;
                }
            }
        }

        if (this.currentScene) {
            this.currentScene.update(deltaTime);
        }
    }

    render(ctx) {
        if (this.currentScene) {
            this.currentScene.render(ctx);
        }

        if (this.isTransitioning) {
            this.renderTransition(ctx);
        }
    }

    renderTransition(ctx) {
        const progress = this.transitionTimer / this.transitionDuration;
        const alpha = Math.min(progress, 1);

        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
    }

    getCurrentScene() {
        return this.currentScene;
    }
}
