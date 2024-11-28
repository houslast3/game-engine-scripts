class GameExporter {
    constructor(engine) {
        this.engine = engine;
    }

    exportGameState() {
        const state = {
            scenes: {},
            config: this.engine.config,
            currentScene: this.engine.currentScene ? this.engine.currentScene.name : null
        };

        // Exporta o estado de cada cena
        this.engine.scenes.forEach((scene, name) => {
            state.scenes[name] = scene.export();
        });

        return state;
    }

    importGameState(state) {
        // Importa configurações
        this.engine.setConfig(state.config);

        // Limpa cenas atuais
        this.engine.scenes.clear();

        // Importa cenas
        Object.entries(state.scenes).forEach(([name, sceneState]) => {
            const scene = new Scene(this.engine);
            scene.import(sceneState);
            this.engine.scenes.set(name, scene);
        });

        // Restaura cena atual
        if (state.currentScene && this.engine.scenes.has(state.currentScene)) {
            this.engine.scene.start(state.currentScene);
        }
    }

    exportToFile() {
        const state = this.exportGameState();
        const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'game-state.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async importFromFile(file) {
        try {
            const text = await file.text();
            const state = JSON.parse(text);
            this.importGameState(state);
            return true;
        } catch (error) {
            console.error('Error importing game state:', error);
            return false;
        }
    }
}

// Exporta a classe
window.GameExporter = GameExporter;
