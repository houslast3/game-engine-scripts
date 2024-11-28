class PreviewSystem {
    constructor(engine) {
        this.engine = engine;
        this.previewWindow = null;
        this.previewOrientation = 'landscape';
        this.previewScale = 1;
        this.previewResolution = { width: 1280, height: 720 };
        this.isPlaying = false;
        this.debugMode = false;
        
        this.setupPreviewContainer();
    }

    setupPreviewContainer() {
        // Cria o container de preview
        this.container = document.createElement('div');
        this.container.className = 'preview-container';
        
        // Canvas de preview
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'preview-canvas';
        this.container.appendChild(this.canvas);
        
        // Controles de preview
        this.controls = document.createElement('div');
        this.controls.className = 'preview-controls';
        this.controls.innerHTML = `
            <div class="control-group">
                <button class="play-button">▶</button>
                <button class="pause-button" style="display: none;">⏸</button>
                <button class="stop-button">⏹</button>
                <button class="restart-button">↺</button>
            </div>
            <div class="control-group">
                <button class="debug-button">🐞</button>
                <select class="resolution-select">
                    <option value="1280,720">HD (1280x720)</option>
                    <option value="1920,1080">Full HD (1920x1080)</option>
                    <option value="2560,1440">2K (2560x1440)</option>
                    <option value="3840,2160">4K (3840x2160)</option>
                    <option value="custom">Custom...</option>
                </select>
                <select class="orientation-select">
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                </select>
                <select class="scale-select">
                    <option value="0.25">25%</option>
                    <option value="0.5">50%</option>
                    <option value="0.75">75%</option>
                    <option value="1" selected>100%</option>
                    <option value="1.25">125%</option>
                    <option value="1.5">150%</option>
                    <option value="2">200%</option>
                </select>
            </div>
        `;
        this.container.appendChild(this.controls);
        
        // Adiciona ao documento
        document.body.appendChild(this.container);
        
        // Configura eventos
        this.setupEvents();
    }

    setupEvents() {
        // Botões de controle
        this.controls.querySelector('.play-button').addEventListener('click', () => this.play());
        this.controls.querySelector('.pause-button').addEventListener('click', () => this.pause());
        this.controls.querySelector('.stop-button').addEventListener('click', () => this.stop());
        this.controls.querySelector('.restart-button').addEventListener('click', () => this.restart());
        this.controls.querySelector('.debug-button').addEventListener('click', () => this.toggleDebug());
        
        // Seletores
        this.controls.querySelector('.resolution-select').addEventListener('change', (e) => {
            const [width, height] = e.target.value.split(',').map(Number);
            if (width && height) {
                this.setResolution(width, height);
            } else if (e.target.value === 'custom') {
                this.promptCustomResolution();
            }
        });
        
        this.controls.querySelector('.orientation-select').addEventListener('change', (e) => {
            this.setOrientation(e.target.value);
        });
        
        this.controls.querySelector('.scale-select').addEventListener('change', (e) => {
            this.setScale(parseFloat(e.target.value));
        });
    }

    promptCustomResolution() {
        const width = prompt('Enter width (pixels):', '1280');
        const height = prompt('Enter height (pixels):', '720');
        
        if (width && height) {
            const w = parseInt(width);
            const h = parseInt(height);
            if (w > 0 && h > 0) {
                this.setResolution(w, h);
            }
        }
    }

    setResolution(width, height) {
        this.previewResolution = { width, height };
        this.canvas.width = width;
        this.canvas.height = height;
        this.updatePreviewSize();
        this.engine.events.emit('previewResolutionChanged', { width, height });
    }

    setOrientation(orientation) {
        this.previewOrientation = orientation;
        this.updatePreviewSize();
        this.engine.events.emit('previewOrientationChanged', orientation);
    }

    setScale(scale) {
        this.previewScale = scale;
        this.updatePreviewSize();
        this.engine.events.emit('previewScaleChanged', scale);
    }

    updatePreviewSize() {
        const { width, height } = this.previewResolution;
        const scale = this.previewScale;
        
        if (this.previewOrientation === 'portrait') {
            this.canvas.style.width = `${height * scale}px`;
            this.canvas.style.height = `${width * scale}px`;
            this.canvas.style.transform = 'rotate(90deg)';
        } else {
            this.canvas.style.width = `${width * scale}px`;
            this.canvas.style.height = `${height * scale}px`;
            this.canvas.style.transform = 'none';
        }
    }

    play() {
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.controls.querySelector('.play-button').style.display = 'none';
            this.controls.querySelector('.pause-button').style.display = 'inline-block';
            this.engine.events.emit('previewStarted');
        }
    }

    pause() {
        if (this.isPlaying) {
            this.isPlaying = false;
            this.controls.querySelector('.play-button').style.display = 'inline-block';
            this.controls.querySelector('.pause-button').style.display = 'none';
            this.engine.events.emit('previewPaused');
        }
    }

    stop() {
        this.isPlaying = false;
        this.controls.querySelector('.play-button').style.display = 'inline-block';
        this.controls.querySelector('.pause-button').style.display = 'none';
        this.engine.events.emit('previewStopped');
    }

    restart() {
        this.stop();
        setTimeout(() => this.play(), 0);
        this.engine.events.emit('previewRestarted');
    }

    toggleDebug() {
        this.debugMode = !this.debugMode;
        this.controls.querySelector('.debug-button').classList.toggle('active', this.debugMode);
        this.engine.events.emit('previewDebugToggled', this.debugMode);
    }

    // Métodos públicos para controle externo
    getCanvas() {
        return this.canvas;
    }

    getContext() {
        return this.canvas.getContext('2d');
    }

    getResolution() {
        return { ...this.previewResolution };
    }

    getOrientation() {
        return this.previewOrientation;
    }

    getScale() {
        return this.previewScale;
    }

    isDebugEnabled() {
        return this.debugMode;
    }
}

// Exporta a classe
window.PreviewSystem = PreviewSystem;
