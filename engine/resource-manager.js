class ResourceManager {
    constructor(engine) {
        this.engine = engine;
        this.resources = new Map();
        this.loading = new Map();
    }

    async loadImage(key, url) {
        if (this.resources.has(key)) {
            return this.resources.get(key);
        }

        if (this.loading.has(key)) {
            return this.loading.get(key);
        }

        const loadPromise = new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.resources.set(key, img);
                this.loading.delete(key);
                resolve(img);
            };
            img.onerror = () => {
                this.loading.delete(key);
                reject(new Error(`Failed to load image: ${url}`));
            };
            img.src = url;
        });

        this.loading.set(key, loadPromise);
        return loadPromise;
    }

    async loadAudio(key, url) {
        if (this.resources.has(key)) {
            return this.resources.get(key);
        }

        if (this.loading.has(key)) {
            return this.loading.get(key);
        }

        const loadPromise = new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.oncanplaythrough = () => {
                this.resources.set(key, audio);
                this.loading.delete(key);
                resolve(audio);
            };
            audio.onerror = () => {
                this.loading.delete(key);
                reject(new Error(`Failed to load audio: ${url}`));
            };
            audio.src = url;
        });

        this.loading.set(key, loadPromise);
        return loadPromise;
    }

    get(key) {
        return this.resources.get(key);
    }

    unload(key) {
        this.resources.delete(key);
    }

    clear() {
        this.resources.clear();
        this.loading.clear();
    }
}

// Exporta a classe
window.ResourceManager = ResourceManager;
