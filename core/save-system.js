class SaveSystem {
    constructor(engine) {
        this.engine = engine;
        this.currentProject = null;
        this.autoSaveInterval = 5 * 60 * 1000; // 5 minutos
        this.setupAutoSave();
    }

    setupAutoSave() {
        setInterval(() => {
            if (this.currentProject) {
                this.saveProject(this.currentProject.name + '_autosave');
            }
        }, this.autoSaveInterval);
    }

    async saveProject(name) {
        try {
            const projectData = {
                name: name,
                version: '1.0.0',
                timestamp: Date.now(),
                scenes: this.engine.sceneManager.serializeScenes(),
                assets: this.engine.assetManager.serializeAssets(),
                settings: this.engine.settings.serialize(),
                metadata: {
                    resolution: this.engine.renderer.resolution,
                    orientation: this.engine.settings.orientation,
                    plugins: this.engine.pluginManager.getActivePlugins()
                }
            };

            // Salva em IndexedDB para projetos grandes
            await this.saveToIndexedDB(name, projectData);
            
            // Backup em localStorage (apenas metadados)
            const metadata = {
                name: name,
                timestamp: projectData.timestamp,
                thumbnail: await this.createThumbnail()
            };
            localStorage.setItem(`project_${name}_meta`, JSON.stringify(metadata));

            // Opção de download como arquivo
            this.downloadProjectFile(projectData);

            console.info(`Projeto "${name}" salvo com sucesso`);
            return true;
        } catch (error) {
            console.error('Erro ao salvar projeto:', error);
            throw error;
        }
    }

    async loadProject(name) {
        try {
            // Tenta carregar do IndexedDB primeiro
            const projectData = await this.loadFromIndexedDB(name);
            
            if (!projectData) {
                throw new Error(`Projeto "${name}" não encontrado`);
            }

            // Limpa o estado atual
            this.engine.reset();

            // Carrega os dados do projeto
            await this.engine.assetManager.loadAssets(projectData.assets);
            await this.engine.sceneManager.loadScenes(projectData.scenes);
            this.engine.settings.load(projectData.settings);

            // Configura metadados
            if (projectData.metadata) {
                this.engine.renderer.setResolution(projectData.metadata.resolution);
                this.engine.settings.setOrientation(projectData.metadata.orientation);
                await this.engine.pluginManager.loadPlugins(projectData.metadata.plugins);
            }

            this.currentProject = {
                name: name,
                timestamp: projectData.timestamp
            };

            console.info(`Projeto "${name}" carregado com sucesso`);
            return true;
        } catch (error) {
            console.error('Erro ao carregar projeto:', error);
            throw error;
        }
    }

    async saveToIndexedDB(name, data) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('GameEngine', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                const tx = db.transaction('projects', 'readwrite');
                const store = tx.objectStore('projects');

                store.put({
                    name: name,
                    data: data,
                    timestamp: Date.now()
                });

                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            };

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('projects')) {
                    db.createObjectStore('projects', { keyPath: 'name' });
                }
            };
        });
    }

    async loadFromIndexedDB(name) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('GameEngine', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                const tx = db.transaction('projects', 'readonly');
                const store = tx.objectStore('projects');
                const getRequest = store.get(name);

                getRequest.onsuccess = () => {
                    resolve(getRequest.result ? getRequest.result.data : null);
                };
                getRequest.onerror = () => reject(getRequest.error);
            };
        });
    }

    async createThumbnail() {
        // Cria uma miniatura da cena atual
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');
        
        // Renderiza a cena atual em miniatura
        this.engine.renderer.renderToCanvas(canvas);
        
        return canvas.toDataURL('image/jpeg', 0.7);
    }

    downloadProjectFile(projectData) {
        const blob = new Blob([JSON.stringify(projectData, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectData.name}.gameproject`;
        a.click();
        URL.revokeObjectURL(url);
    }

    getRecentProjects() {
        const projects = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('project_') && key.endsWith('_meta')) {
                projects.push(JSON.parse(localStorage.getItem(key)));
            }
        }
        return projects.sort((a, b) => b.timestamp - a.timestamp);
    }

    async importProject(file) {
        try {
            const text = await file.text();
            const projectData = JSON.parse(text);
            await this.saveProject(projectData.name);
            return true;
        } catch (error) {
            console.error('Erro ao importar projeto:', error);
            throw error;
        }
    }
}
