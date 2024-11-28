class PropertiesPanel {
    constructor(engine) {
        this.engine = engine;
        this.currentObject = null;
        this.element = document.createElement('div');
        this.element.className = 'properties-panel';
        
        this.setupPanel();
    }

    setupPanel() {
        this.element.innerHTML = `
            <div class="panel-header">
                <h3>Properties</h3>
            </div>
            <div class="panel-content">
                <div class="no-selection">No object selected</div>
            </div>
        `;
    }

    showProperties(obj) {
        this.currentObject = obj;
        const content = this.element.querySelector('.panel-content');
        
        content.innerHTML = `
            <div class="property-group">
                <h4>Transform</h4>
                <div class="property">
                    <label>Position X</label>
                    <input type="number" class="position-x" value="${obj.x}" step="1"/>
                </div>
                <div class="property">
                    <label>Position Y</label>
                    <input type="number" class="position-y" value="${obj.y}" step="1"/>
                </div>
                <div class="property">
                    <label>Width</label>
                    <input type="number" class="width" value="${obj.width}" step="1"/>
                </div>
                <div class="property">
                    <label>Height</label>
                    <input type="number" class="height" value="${obj.height}" step="1"/>
                </div>
                ${this.getTypeSpecificProperties(obj)}
            </div>
        `;

        this.setupPropertyListeners();
    }

    getTypeSpecificProperties(obj) {
        switch(obj.type) {
            case 'sprite':
                return `
                    <div class="property-group">
                        <h4>Sprite</h4>
                        <div class="property">
                            <label>Image</label>
                            <select class="sprite-image">
                                ${this.getSpriteOptions()}
                            </select>
                        </div>
                        <div class="property">
                            <label>Animation</label>
                            <select class="sprite-animation">
                                ${this.getAnimationOptions(obj)}
                            </select>
                        </div>
                    </div>
                `;
            case 'text':
                return `
                    <div class="property-group">
                        <h4>Text</h4>
                        <div class="property">
                            <label>Content</label>
                            <input type="text" class="text-content" value="${obj.text || ''}"/>
                        </div>
                        <div class="property">
                            <label>Font Size</label>
                            <input type="number" class="font-size" value="${obj.fontSize || 16}" step="1"/>
                        </div>
                        <div class="property">
                            <label>Color</label>
                            <input type="color" class="text-color" value="${obj.color || '#000000'}"/>
                        </div>
                    </div>
                `;
            case 'shape':
                return `
                    <div class="property-group">
                        <h4>Shape</h4>
                        <div class="property">
                            <label>Type</label>
                            <select class="shape-type">
                                <option value="rectangle" ${obj.shapeType === 'rectangle' ? 'selected' : ''}>Rectangle</option>
                                <option value="circle" ${obj.shapeType === 'circle' ? 'selected' : ''}>Circle</option>
                                <option value="polygon" ${obj.shapeType === 'polygon' ? 'selected' : ''}>Polygon</option>
                            </select>
                        </div>
                        <div class="property">
                            <label>Fill Color</label>
                            <input type="color" class="fill-color" value="${obj.fillColor || '#ffffff'}"/>
                        </div>
                        <div class="property">
                            <label>Stroke Color</label>
                            <input type="color" class="stroke-color" value="${obj.strokeColor || '#000000'}"/>
                        </div>
                    </div>
                `;
            default:
                return '';
        }
    }

    getSpriteOptions() {
        const sprites = this.engine.spriteManager.getSprites();
        return sprites.map(sprite => 
            `<option value="${sprite.id}" ${this.currentObject.sprite === sprite.id ? 'selected' : ''}>
                ${sprite.name}
            </option>`
        ).join('');
    }

    getAnimationOptions(obj) {
        if (!obj.sprite) return '<option value="">No animations</option>';
        
        const sprite = this.engine.spriteManager.getSprite(obj.sprite);
        if (!sprite || !sprite.animations) return '<option value="">No animations</option>';
        
        return Object.keys(sprite.animations).map(anim => 
            `<option value="${anim}" ${obj.currentAnimation === anim ? 'selected' : ''}>
                ${anim}
            </option>`
        ).join('');
    }

    setupPropertyListeners() {
        if (!this.currentObject) return;

        // Transform properties
        this.setupNumberInput('.position-x', 'x');
        this.setupNumberInput('.position-y', 'y');
        this.setupNumberInput('.width', 'width');
        this.setupNumberInput('.height', 'height');

        // Type specific properties
        switch(this.currentObject.type) {
            case 'sprite':
                this.setupSpriteListeners();
                break;
            case 'text':
                this.setupTextListeners();
                break;
            case 'shape':
                this.setupShapeListeners();
                break;
        }
    }

    setupNumberInput(selector, property) {
        const input = this.element.querySelector(selector);
        if (!input) return;

        input.addEventListener('change', () => {
            this.currentObject[property] = parseFloat(input.value);
            this.engine.ui.editor.render();
        });

        input.addEventListener('input', () => {
            this.currentObject[property] = parseFloat(input.value);
            this.engine.ui.editor.render();
        });
    }

    setupSpriteListeners() {
        const imageSelect = this.element.querySelector('.sprite-image');
        const animSelect = this.element.querySelector('.sprite-animation');

        if (imageSelect) {
            imageSelect.addEventListener('change', () => {
                this.currentObject.sprite = imageSelect.value;
                this.showProperties(this.currentObject); // Refresh para atualizar animações
            });
        }

        if (animSelect) {
            animSelect.addEventListener('change', () => {
                this.currentObject.currentAnimation = animSelect.value;
                this.engine.ui.editor.render();
            });
        }
    }

    setupTextListeners() {
        const textInput = this.element.querySelector('.text-content');
        const fontSizeInput = this.element.querySelector('.font-size');
        const colorInput = this.element.querySelector('.text-color');

        if (textInput) {
            textInput.addEventListener('input', () => {
                this.currentObject.text = textInput.value;
                this.engine.ui.editor.render();
            });
        }

        if (fontSizeInput) {
            fontSizeInput.addEventListener('change', () => {
                this.currentObject.fontSize = parseInt(fontSizeInput.value);
                this.engine.ui.editor.render();
            });
        }

        if (colorInput) {
            colorInput.addEventListener('input', () => {
                this.currentObject.color = colorInput.value;
                this.engine.ui.editor.render();
            });
        }
    }

    setupShapeListeners() {
        const typeSelect = this.element.querySelector('.shape-type');
        const fillColorInput = this.element.querySelector('.fill-color');
        const strokeColorInput = this.element.querySelector('.stroke-color');

        if (typeSelect) {
            typeSelect.addEventListener('change', () => {
                this.currentObject.shapeType = typeSelect.value;
                this.engine.ui.editor.render();
            });
        }

        if (fillColorInput) {
            fillColorInput.addEventListener('input', () => {
                this.currentObject.fillColor = fillColorInput.value;
                this.engine.ui.editor.render();
            });
        }

        if (strokeColorInput) {
            strokeColorInput.addEventListener('input', () => {
                this.currentObject.strokeColor = strokeColorInput.value;
                this.engine.ui.editor.render();
            });
        }
    }

    updateProperties() {
        if (this.currentObject) {
            this.showProperties(this.currentObject);
        }
    }

    clearProperties() {
        this.currentObject = null;
        this.setupPanel();
    }
}
