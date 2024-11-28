class AssetManager {
    constructor(engine) {
        this.engine = engine;
        this.element = document.createElement('div');
        this.element.className = 'assets-panel';
        this.assets = new Map();
        this.categories = ['images', 'audio', 'fonts', 'data'];
        this.currentCategory = 'images';
        
        this.setupPanel();
        this.setupEventListeners();
    }

    setupPanel() {
        this.element.innerHTML = `
            <div class="panel-header">
                <h3>Assets</h3>
                <div class="panel-actions">
                    <button class="import-btn">Import</button>
                    <input type="file" class="file-input" multiple style="display: none">
                </div>
            </div>
            <div class="panel-categories">
                ${this.categories.map(cat => `
                    <button class="category-btn ${cat === this.currentCategory ? 'active' : ''}" 
                            data-category="${cat}">
                        ${this.getCategoryIcon(cat)} ${cat}
                    </button>
                `).join('')}
            </div>
            <div class="panel-content">
                <div class="assets-grid"></div>
            </div>
        `;

        this.setupImportButton();
    }

    setupEventListeners() {
        // Mudança de categoria
        const categoryButtons = this.element.querySelectorAll('.category-btn');
        categoryButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentCategory = btn.dataset.category;
                categoryButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.refreshAssetGrid();
            });
        });

        // Drag and drop na grid
        const grid = this.element.querySelector('.assets-grid');
        grid.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        grid.addEventListener('drop', (e) => {
            e.preventDefault();
            const files = Array.from(e.dataTransfer.files);
            this.importFiles(files);
        });
    }

    setupImportButton() {
        const importBtn = this.element.querySelector('.import-btn');
        const fileInput = this.element.querySelector('.file-input');

        importBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', () => {
            const files = Array.from(fileInput.files);
            this.importFiles(files);
            fileInput.value = ''; // Reset para permitir selecionar o mesmo arquivo
        });
    }

    getCategoryIcon(category) {
        switch(category) {
            case 'images':
                return '🖼️';
            case 'audio':
                return '🔊';
            case 'fonts':
                return '📝';
            case 'data':
                return '📁';
            default:
                return '📦';
        }
    }

    async importFiles(files) {
        for (const file of files) {
            try {
                const asset = await this.loadAsset(file);
                if (asset) {
                    this.assets.set(asset.id, asset);
                    this.refreshAssetGrid();
                }
            } catch (error) {
                console.error('Error importing file:', file.name, error);
                // Mostrar erro na UI
            }
        }
    }

    async loadAsset(file) {
        const id = Date.now() + '_' + file.name;
        const type = this.getAssetType(file);
        
        if (!type) {
            console.warn('Unsupported file type:', file.type);
            return null;
        }

        const asset = {
            id,
            name: file.name,
            type,
            file,
            url: URL.createObjectURL(file)
        };

        // Carrega preview ou metadados específicos do tipo
        switch(type) {
            case 'image':
                await this.loadImageMetadata(asset);
                break;
            case 'audio':
                await this.loadAudioMetadata(asset);
                break;
            case 'font':
                await this.loadFontMetadata(asset);
                break;
        }

        return asset;
    }

    getAssetType(file) {
        const type = file.type.split('/')[0];
        switch(type) {
            case 'image':
                return 'image';
            case 'audio':
                return 'audio';
            case 'font':
            case 'application': // Para fontes ttf/otf
                if (file.name.match(/\.(ttf|otf|woff|woff2)$/)) {
                    return 'font';
                }
                return 'data';
            default:
                return 'data';
        }
    }

    async loadImageMetadata(asset) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                asset.width = img.width;
                asset.height = img.height;
                resolve();
            };
            img.onerror = reject;
            img.src = asset.url;
        });
    }

    async loadAudioMetadata(asset) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.onloadedmetadata = () => {
                asset.duration = audio.duration;
                resolve();
            };
            audio.onerror = reject;
            audio.src = asset.url;
        });
    }

    async loadFontMetadata(asset) {
        // Carrega a fonte usando FontFace API
        const fontName = 'font_' + asset.id;
        const fontFace = new FontFace(fontName, `url(${asset.url})`);
        
        try {
            await fontFace.load();
            document.fonts.add(fontFace);
            asset.fontName = fontName;
        } catch (error) {
            console.error('Error loading font:', error);
        }
    }

    refreshAssetGrid() {
        const grid = this.element.querySelector('.assets-grid');
        const assets = Array.from(this.assets.values())
            .filter(asset => this.getAssetCategory(asset.type) === this.currentCategory);

        grid.innerHTML = assets.map(asset => this.createAssetItem(asset)).join('');

        // Setup drag para os itens
        const items = grid.querySelectorAll('.asset-item');
        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'asset',
                    id: item.dataset.id
                }));
            });
        });
    }

    getAssetCategory(type) {
        switch(type) {
            case 'image':
                return 'images';
            case 'audio':
                return 'audio';
            case 'font':
                return 'fonts';
            default:
                return 'data';
        }
    }

    createAssetItem(asset) {
        return `
            <div class="asset-item" 
                 data-id="${asset.id}"
                 draggable="true">
                ${this.createAssetPreview(asset)}
                <div class="asset-info">
                    <div class="asset-name">${asset.name}</div>
                    ${this.createAssetMetadata(asset)}
                </div>
                <div class="asset-actions">
                    <button class="delete-btn" onclick="this.deleteAsset('${asset.id}')">🗑️</button>
                </div>
            </div>
        `;
    }

    createAssetPreview(asset) {
        switch(asset.type) {
            case 'image':
                return `<img src="${asset.url}" alt="${asset.name}">`;
            case 'audio':
                return `<div class="audio-preview">🎵</div>`;
            case 'font':
                return `<div class="font-preview" style="font-family: '${asset.fontName}'">Aa</div>`;
            default:
                return `<div class="file-preview">📄</div>`;
        }
    }

    createAssetMetadata(asset) {
        switch(asset.type) {
            case 'image':
                return `<div class="asset-metadata">${asset.width}x${asset.height}</div>`;
            case 'audio':
                return `<div class="asset-metadata">${Math.round(asset.duration)}s</div>`;
            default:
                return '';
        }
    }

    deleteAsset(id) {
        const asset = this.assets.get(id);
        if (asset) {
            URL.revokeObjectURL(asset.url);
            this.assets.delete(id);
            this.refreshAssetGrid();
        }
    }

    getAsset(id) {
        return this.assets.get(id);
    }

    getAllAssets() {
        return Array.from(this.assets.values());
    }

    getAssetsByType(type) {
        return this.getAllAssets().filter(asset => asset.type === type);
    }
}
