class Hierarchy {
    constructor(engine) {
        this.engine = engine;
        this.element = document.createElement('div');
        this.element.className = 'hierarchy-panel';
        this.draggedItem = null;
        this.dropTarget = null;
        
        this.setupPanel();
        this.setupEventListeners();
    }

    setupPanel() {
        this.element.innerHTML = `
            <div class="panel-header">
                <h3>Hierarchy</h3>
                <div class="panel-actions">
                    <button class="add-object-btn">+</button>
                </div>
            </div>
            <div class="panel-content">
                <div class="hierarchy-tree"></div>
            </div>
        `;

        const addButton = this.element.querySelector('.add-object-btn');
        addButton.addEventListener('click', () => this.showAddObjectMenu());
    }

    setupEventListeners() {
        // Delegação de eventos para itens da hierarquia
        this.element.addEventListener('click', (e) => {
            const item = e.target.closest('.hierarchy-item');
            if (item) {
                const id = parseInt(item.dataset.id);
                const obj = this.engine.getCurrentScene().getGameObject(id);
                if (obj) {
                    this.selectObject(obj);
                }
            }
        });

        // Drag and drop para reordenar
        this.element.addEventListener('dragstart', (e) => {
            const item = e.target.closest('.hierarchy-item');
            if (item) {
                this.draggedItem = item;
                e.dataTransfer.setData('text/plain', item.dataset.id);
                item.classList.add('dragging');
            }
        });

        this.element.addEventListener('dragover', (e) => {
            e.preventDefault();
            const item = e.target.closest('.hierarchy-item');
            if (item && item !== this.draggedItem) {
                this.dropTarget = item;
                this.updateDropIndicator(e.clientY);
            }
        });

        this.element.addEventListener('dragleave', () => {
            this.removeDropIndicator();
        });

        this.element.addEventListener('drop', (e) => {
            e.preventDefault();
            if (this.draggedItem && this.dropTarget) {
                const draggedId = parseInt(this.draggedItem.dataset.id);
                const targetId = parseInt(this.dropTarget.dataset.id);
                
                const scene = this.engine.getCurrentScene();
                scene.reorderGameObject(draggedId, targetId);
                
                this.refresh();
            }
            
            this.draggedItem = null;
            this.dropTarget = null;
            this.removeDropIndicator();
        });

        this.element.addEventListener('dragend', () => {
            if (this.draggedItem) {
                this.draggedItem.classList.remove('dragging');
            }
            this.removeDropIndicator();
        });
    }

    refresh() {
        const tree = this.element.querySelector('.hierarchy-tree');
        const scene = this.engine.getCurrentScene();
        const objects = scene.getAllGameObjects();
        
        tree.innerHTML = objects.map(obj => this.createHierarchyItem(obj)).join('');
    }

    createHierarchyItem(obj) {
        const isSelected = this.engine.ui.editor.selectedObject === obj;
        return `
            <div class="hierarchy-item ${isSelected ? 'selected' : ''}" 
                 data-id="${obj.id}"
                 draggable="true">
                <span class="item-icon">${this.getObjectIcon(obj)}</span>
                <span class="item-name">${obj.name || obj.type}</span>
                <div class="item-actions">
                    <button class="visibility-btn">👁️</button>
                    <button class="lock-btn">🔒</button>
                </div>
            </div>
        `;
    }

    getObjectIcon(obj) {
        switch(obj.type) {
            case 'sprite':
                return '🖼️';
            case 'text':
                return '📝';
            case 'shape':
                return '⬜';
            default:
                return '📦';
        }
    }

    selectObject(obj) {
        this.engine.ui.editor.selectedObject = obj;
        this.engine.ui.properties.showProperties(obj);
        this.refresh(); // Atualiza a seleção visual
    }

    showAddObjectMenu() {
        const menu = document.createElement('div');
        menu.className = 'add-object-menu';
        menu.innerHTML = `
            <div class="menu-item" data-type="sprite">🖼️ Sprite</div>
            <div class="menu-item" data-type="text">📝 Text</div>
            <div class="menu-item" data-type="shape">⬜ Shape</div>
        `;

        menu.style.position = 'absolute';
        const addButton = this.element.querySelector('.add-object-btn');
        const rect = addButton.getBoundingClientRect();
        menu.style.top = rect.bottom + 'px';
        menu.style.left = rect.left + 'px';

        document.body.appendChild(menu);

        const closeMenu = () => {
            document.body.removeChild(menu);
            document.removeEventListener('click', closeMenu);
        };

        menu.addEventListener('click', (e) => {
            const item = e.target.closest('.menu-item');
            if (item) {
                const type = item.dataset.type;
                this.createNewObject(type);
                closeMenu();
            }
        });

        // Fecha o menu ao clicar fora
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
    }

    createNewObject(type) {
        const scene = this.engine.getCurrentScene();
        const obj = {
            id: Date.now(),
            type: type,
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            name: `${type}_${scene.getAllGameObjects().length + 1}`
        };

        scene.addGameObject(obj);
        this.refresh();
        this.selectObject(obj);
    }

    updateDropIndicator(y) {
        this.removeDropIndicator();
        
        if (!this.dropTarget) return;
        
        const rect = this.dropTarget.getBoundingClientRect();
        const threshold = rect.top + rect.height / 2;
        
        const indicator = document.createElement('div');
        indicator.className = 'drop-indicator';
        
        if (y < threshold) {
            this.dropTarget.before(indicator);
        } else {
            this.dropTarget.after(indicator);
        }
    }

    removeDropIndicator() {
        const indicator = this.element.querySelector('.drop-indicator');
        if (indicator) {
            indicator.remove();
        }
    }
}
