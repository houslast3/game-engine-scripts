class PreviewSystem {
    constructor(engine) {
        this.engine = engine;
    }

    createPreview(width = 320, height = 240) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Renderiza a cena atual no canvas de preview
        if (this.engine.currentScene) {
            this.engine.currentScene.render(ctx);
        }

        return canvas;
    }

    captureFrame() {
        return this.engine.renderer.canvas.toDataURL('image/png');
    }

    startRecording(fps = 60) {
        // Implementação básica de gravação de frames
        this.recordingFrames = [];
        this.isRecording = true;
        this.recordingInterval = setInterval(() => {
            if (this.isRecording) {
                this.recordingFrames.push(this.captureFrame());
            }
        }, 1000 / fps);
    }

    stopRecording() {
        this.isRecording = false;
        clearInterval(this.recordingInterval);
        return this.recordingFrames;
    }
}

// Exporta a classe
window.PreviewSystem = PreviewSystem;
