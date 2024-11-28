class Editor {
    constructor(engine) {
        this.engine = engine;
        this.canvas = engine.canvas;
        this.ctx = engine.ctx;
        this.selectedObject = null;
        this.isDragging = false;
        this.gridSize = 32;
        this.showGrid = true;
        this.snapToGrid = true;
        this.tools = new Map();
        this.currentTool = null;
        
        this.initializeTools();
        this.setupEventListeners();
    }

    initializeTools() {
        // Ferramenta de Seleção
        this.tools.set('select', {
            name: 'select',
            icon: '🖱️',
            onMouseDown: (e) => this.handleSelection(e),
            onMouseMove: (e) => this.handleDrag(e),
            onMouseUp: () => this.handleDragEnd()
        });

        // Ferramenta de Criação
        this.tools.set('create', {
            name: 'create',
            icon: '➕',
            onMouseDown: (e) => this.handleObjectCreation(e)
        });

        // Ferramenta de Pintura
        this.tools.set('paint', {
            name: 'paint',
            icon: '🎨',
            onMouseDown: (e) => this.handlePaint(e)
        });

        this.setTool('select');
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.currentTool && this.currentTool.onMouseDown) {
                this.currentTool.onMouseDown(this.getMousePosition(e));
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.currentTool && this.currentTool.onMouseMove) {
                this.currentTool.onMouseMove(this.getMousePosition(e));
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            if (this.currentTool && this.currentTool.onMouseUp) {
                this.currentTool.onMouseUp();
            }
        });

        // Atalhos de teclado
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'Delete':
                    this.deleteSelectedObject();
                    break;
                case 'g':
                    this.toggleGrid();
                    break;
                case 's':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.saveScene();
                    }
                    break;
                case 'z':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.undo();
                    }
                    break;
                case 'y':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.redo();
                    }
                    break;
            }
        });
    }

    setTool(toolName) {
        this.currentTool = this.tools.get(toolName);
        this.canvas.style.cursor = toolName === 'select' ? 'default' : 'crosshair';
    }

    getMousePosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        if (this.snapToGrid) {
            return {
                x: Math.round(x / this.gridSize) * this.gridSize,
                y: Math.round(y / this.gridSize) * this.gridSize
            };
        }
        
        return { x, y };
    }

    handleSelection(position) {
        const objects = this.engine.getCurrentScene().getAllGameObjects();
        this.selectedObject = null;

        // Encontra o objeto mais ao topo que contém o ponto
        for (let i = objects.length - 1; i >= 0; i--) {
            const obj = objects[i];
            if (this.isPointInObject(position, obj)) {
                this.selectedObject = obj;
                this.isDragging = true;
                break;
            }
        }

        // Atualiza o painel de propriedades
        if (this.selectedObject) {
            this.engine.ui.properties.showProperties(this.selectedObject);
        }
    }

    handleDrag(position) {
        if (this.isDragging && this.selectedObject) {
            this.selectedObject.x = position.x;
            this.selectedObject.y = position.y;
            this.engine.ui.properties.updateProperties();
        }
    }

    handleDragEnd() {
        this.isDragging = false;
    }

    handleObjectCreation(position) {
        const obj = {
            id: Date.now(),
            x: position.x,
            y: position.y,
            width: this.gridSize,
            height: this.gridSize,
            type: 'sprite',
            sprite: null
        };

        this.engine.getCurrentScene().addGameObject(obj);
        this.selectedObject = obj;
        this.engine.ui.properties.showProperties(obj);
    }

    handlePaint(position) {
        if (this.selectedObject) {
            // Implementar lógica de pintura
        }
    }

    isPointInObject(point, obj) {
        return point.x >= obj.x && 
               point.x <= obj.x + obj.width &&
               point.y >= obj.y && 
               point.y <= obj.y + obj.height;
    }

    deleteSelectedObject() {
        if (this.selectedObject) {
            this.engine.getCurrentScene().removeGameObject(this.selectedObject);
            this.selectedObject = null;
            this.engine.ui.properties.clearProperties();
            this.engine.ui.hierarchy.refresh();
        }
    }

    toggleGrid() {
        this.showGrid = !this.showGrid;
    }

    saveScene() {
        const scene = this.engine.getCurrentScene();
        const data = {
            objects: scene.getAllGameObjects(),
            camera: scene.camera,
            settings: {
                gridSize: this.gridSize,
                showGrid: this.showGrid,
                snapToGrid: this.snapToGrid
            }
        };

        const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'scene.json';
        a.click();
        
        URL.revokeObjectURL(url);
    }

    loadScene(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = JSON.parse(e.target.result);
            const scene = this.engine.getCurrentScene();
            
            scene.clear();
            
            data.objects.forEach(obj => {
                scene.addGameObject(obj);
            });

            Object.assign(scene.camera, data.camera);
            Object.assign(this, data.settings);

            this.engine.ui.hierarchy.refresh();
        };
        reader.readAsText(file);
    }

    undo() {
        // Implementar sistema de undo/redo
    }

    redo() {
        // Implementar sistema de undo/redo
    }

    render() {
        // Desenha a grade
        if (this.showGrid) {
            this.ctx.save();
            this.ctx.strokeStyle = '#333333';
            this.ctx.lineWidth = 1;

            for (let x = 0; x < this.canvas.width; x += this.gridSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.canvas.height);
                this.ctx.stroke();
            }

            for (let y = 0; y < this.canvas.height; y += this.gridSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.canvas.width, y);
                this.ctx.stroke();
            }

            this.ctx.restore();
        }

        // Desenha a seleção
        if (this.selectedObject) {
            this.ctx.save();
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                this.selectedObject.x - 2,
                this.selectedObject.y - 2,
                this.selectedObject.width + 4,
                this.selectedObject.height + 4
            );
            this.ctx.restore();
        }
    }
}
