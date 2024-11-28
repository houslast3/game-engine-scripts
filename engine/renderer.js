class Renderer {
    constructor(engine) {
        this.engine = engine;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.layers = new Map();
        this.camera = new Camera();
        this.sprites = new Map();
        this.effects = new Map();
        this.viewport = { x: 0, y: 0, width: 800, height: 600 };
        
        // Configurações
        this.config = {
            antialias: true,
            smoothing: true,
            backgroundColor: '#1e1e1e',
            showGrid: false,
            gridSize: 32,
            gridColor: 'rgba(255, 255, 255, 0.1)'
        };
        
        this.init();
    }

    init() {
        // Configura o canvas
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        
        // Adiciona ao DOM
        document.querySelector('.editor-viewport').appendChild(this.canvas);
        
        // Configura o contexto
        this.ctx.imageSmoothingEnabled = this.config.smoothing;
        
        // Cria camadas padrão
        this.createLayer('background', 0);
        this.createLayer('main', 1);
        this.createLayer('foreground', 2);
        this.createLayer('ui', 3);
        
        // Eventos de redimensionamento
        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    resize() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        this.viewport.width = rect.width;
        this.viewport.height = rect.height;
        
        this.canvas.width = this.viewport.width;
        this.canvas.height = this.viewport.height;
        
        this.ctx.imageSmoothingEnabled = this.config.smoothing;
        
        // Atualiza a câmera
        this.camera.updateViewport(this.viewport);
    }

    clear() {
        this.ctx.fillStyle = this.config.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.config.showGrid) {
            this.drawGrid();
        }
    }

    drawGrid() {
        const { gridSize, gridColor } = this.config;
        const offsetX = this.camera.x % gridSize;
        const offsetY = this.camera.y % gridSize;
        
        this.ctx.strokeStyle = gridColor;
        this.ctx.lineWidth = 1;
        
        // Linhas verticais
        for (let x = -offsetX; x <= this.viewport.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.viewport.height);
            this.ctx.stroke();
        }
        
        // Linhas horizontais
        for (let y = -offsetY; y <= this.viewport.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.viewport.width, y);
            this.ctx.stroke();
        }
    }

    // Gerenciamento de camadas
    createLayer(name, zIndex = 0) {
        this.layers.set(name, {
            zIndex,
            objects: [],
            visible: true,
            opacity: 1
        });
        this.sortLayers();
    }

    setLayerVisibility(name, visible) {
        const layer = this.layers.get(name);
        if (layer) {
            layer.visible = visible;
        }
    }

    setLayerOpacity(name, opacity) {
        const layer = this.layers.get(name);
        if (layer) {
            layer.opacity = Math.max(0, Math.min(1, opacity));
        }
    }

    addToLayer(layerName, object) {
        const layer = this.layers.get(layerName);
        if (layer) {
            layer.objects.push(object);
            return true;
        }
        return false;
    }

    removeFromLayer(layerName, object) {
        const layer = this.layers.get(layerName);
        if (layer) {
            const index = layer.objects.indexOf(object);
            if (index !== -1) {
                layer.objects.splice(index, 1);
                return true;
            }
        }
        return false;
    }

    sortLayers() {
        this.layers = new Map([...this.layers.entries()].sort((a, b) => a[1].zIndex - b[1].zIndex));
    }

    // Funções de desenho
    drawSprite(sprite, x, y, options = {}) {
        const {
            width = sprite.width,
            height = sprite.height,
            rotation = 0,
            scale = 1,
            alpha = 1,
            flipX = false,
            flipY = false,
            sourceX = 0,
            sourceY = 0,
            sourceWidth = sprite.width,
            sourceHeight = sprite.height
        } = options;

        const img = typeof sprite === 'string' ? this.sprites.get(sprite) : sprite;
        if (!img) return;

        this.ctx.save();
        
        // Aplica transformações
        this.ctx.translate(x + width/2, y + height/2);
        this.ctx.rotate(rotation);
        this.ctx.scale(flipX ? -scale : scale, flipY ? -scale : scale);
        this.ctx.globalAlpha = alpha;
        
        // Desenha o sprite
        this.ctx.drawImage(
            img,
            sourceX, sourceY, sourceWidth, sourceHeight,
            -width/2, -height/2, width, height
        );
        
        this.ctx.restore();
    }

    drawShape(shape) {
        this.ctx.save();
        
        // Configurações comuns
        this.ctx.fillStyle = shape.fillStyle || 'black';
        this.ctx.strokeStyle = shape.strokeStyle || 'black';
        this.ctx.lineWidth = shape.lineWidth || 1;
        this.ctx.globalAlpha = shape.alpha || 1;
        
        // Aplica transformações
        this.ctx.translate(shape.x, shape.y);
        if (shape.rotation) {
            this.ctx.rotate(shape.rotation);
        }
        
        // Desenha a forma
        switch (shape.type) {
            case 'rect':
                if (shape.fillStyle) this.ctx.fillRect(-shape.width/2, -shape.height/2, shape.width, shape.height);
                if (shape.strokeStyle) this.ctx.strokeRect(-shape.width/2, -shape.height/2, shape.width, shape.height);
                break;
                
            case 'circle':
                this.ctx.beginPath();
                this.ctx.arc(0, 0, shape.radius, 0, Math.PI * 2);
                if (shape.fillStyle) this.ctx.fill();
                if (shape.strokeStyle) this.ctx.stroke();
                break;
                
            case 'polygon':
                if (shape.points && shape.points.length >= 3) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
                    for (let i = 1; i < shape.points.length; i++) {
                        this.ctx.lineTo(shape.points[i].x, shape.points[i].y);
                    }
                    this.ctx.closePath();
                    if (shape.fillStyle) this.ctx.fill();
                    if (shape.strokeStyle) this.ctx.stroke();
                }
                break;
        }
        
        this.ctx.restore();
    }

    drawText(text, x, y, options = {}) {
        const {
            font = '16px Arial',
            fillStyle = 'white',
            strokeStyle = null,
            lineWidth = 1,
            align = 'left',
            baseline = 'top',
            alpha = 1,
            maxWidth = null
        } = options;

        this.ctx.save();
        this.ctx.font = font;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;
        this.ctx.globalAlpha = alpha;
        
        if (strokeStyle) {
            this.ctx.strokeStyle = strokeStyle;
            this.ctx.lineWidth = lineWidth;
            this.ctx.strokeText(text, x, y, maxWidth);
        }
        
        this.ctx.fillStyle = fillStyle;
        this.ctx.fillText(text, x, y, maxWidth);
        
        this.ctx.restore();
    }

    // Debug
    drawDebugInfo(info) {
        this.ctx.save();
        
        // Configuração do estilo
        const padding = 10;
        const lineHeight = 20;
        const font = '12px Consolas';
        const color = '#00ff00';
        
        this.ctx.font = font;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        
        // Desenha as informações
        let y = padding;
        for (const [key, value] of Object.entries(info)) {
            this.ctx.fillText(`${key}: ${value}`, padding, y);
            y += lineHeight;
        }
        
        this.ctx.restore();
    }

    // Efeitos
    addEffect(name, effect) {
        this.effects.set(name, effect);
    }

    applyEffect(name, params = {}) {
        const effect = this.effects.get(name);
        if (effect) {
            effect(this.ctx, params);
        }
    }
}

// Classe da câmera
class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.scale = 1;
        this.rotation = 0;
        this.target = null;
        this.viewport = { width: 800, height: 600 };
        this.bounds = null;
    }

    updateViewport(viewport) {
        this.viewport = viewport;
    }

    setBounds(bounds) {
        this.bounds = bounds;
    }

    follow(target, offsetX = 0, offsetY = 0) {
        this.target = target;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
    }

    unfollow() {
        this.target = null;
    }

    update() {
        if (this.target) {
            // Calcula a posição desejada
            const targetX = this.target.x + this.offsetX;
            const targetY = this.target.y + this.offsetY;
            
            // Suaviza o movimento
            this.x += (targetX - this.x) * 0.1;
            this.y += (targetY - this.y) * 0.1;
        }
        
        // Aplica limites se definidos
        if (this.bounds) {
            const halfWidth = this.viewport.width / (2 * this.scale);
            const halfHeight = this.viewport.height / (2 * this.scale);
            
            this.x = Math.max(this.bounds.left + halfWidth, Math.min(this.bounds.right - halfWidth, this.x));
            this.y = Math.max(this.bounds.top + halfHeight, Math.min(this.bounds.bottom - halfHeight, this.y));
        }
    }

    apply(ctx) {
        ctx.save();
        
        // Aplica transformações
        ctx.translate(this.viewport.width/2, this.viewport.height/2);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        ctx.translate(-this.x, -this.y);
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.scale = 1;
        this.rotation = 0;
        this.target = null;
    }

    screenToWorld(screenX, screenY) {
        const worldX = (screenX - this.viewport.width/2) / this.scale + this.x;
        const worldY = (screenY - this.viewport.height/2) / this.scale + this.y;
        return { x: worldX, y: worldY };
    }

    worldToScreen(worldX, worldY) {
        const screenX = (worldX - this.x) * this.scale + this.viewport.width/2;
        const screenY = (worldY - this.y) * this.scale + this.viewport.height/2;
        return { x: screenX, y: screenY };
    }
}

// Exporta as classes
window.Renderer = Renderer;
window.Camera = Camera;
