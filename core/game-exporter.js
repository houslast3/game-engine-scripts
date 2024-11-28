class GameExporter {
    constructor(engine) {
        this.engine = engine;
        this.templates = {
            html: this.getHtmlTemplate(),
            manifest: this.getManifestTemplate(),
            serviceWorker: this.getServiceWorkerTemplate()
        };
    }

    async exportGame(options = {}) {
        try {
            const {
                name = 'game',
                target = 'web',
                minify = true,
                includeSourceMaps = false,
                progressive = true,
                orientation = 'landscape'
            } = options;

            // Coleta todos os recursos necessários
            const assets = await this.collectAssets();
            const scripts = await this.collectScripts();
            const styles = await this.collectStyles();

            // Cria o pacote de exportação
            const exportPackage = await this.createExportPackage({
                name,
                target,
                minify,
                includeSourceMaps,
                progressive,
                orientation,
                assets,
                scripts,
                styles
            });

            // Gera o arquivo de exportação
            await this.generateExportFile(exportPackage);

            console.info(`Jogo exportado com sucesso para ${target}`);
            return true;
        } catch (error) {
            console.error('Erro ao exportar jogo:', error);
            throw error;
        }
    }

    async collectAssets() {
        const assets = {
            images: [],
            audio: [],
            fonts: [],
            data: []
        };

        // Coleta todos os assets usados no projeto
        const usedAssets = this.engine.assetManager.getUsedAssets();

        for (const asset of usedAssets) {
            const assetData = await this.processAsset(asset);
            assets[asset.type].push(assetData);
        }

        return assets;
    }

    async processAsset(asset) {
        const data = await this.engine.assetManager.getAssetData(asset.id);
        
        return {
            id: asset.id,
            name: asset.name,
            type: asset.type,
            data: await this.optimizeAsset(data, asset.type),
            metadata: asset.metadata
        };
    }

    async optimizeAsset(data, type) {
        switch (type) {
            case 'image':
                return await this.optimizeImage(data);
            case 'audio':
                return await this.optimizeAudio(data);
            case 'font':
                return await this.optimizeFont(data);
            default:
                return data;
        }
    }

    async optimizeImage(imageData) {
        // Implementa otimização de imagem (compressão, redimensionamento, etc)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        await new Promise(resolve => {
            img.onload = resolve;
            img.src = imageData;
        });

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        return canvas.toDataURL('image/webp', 0.8);
    }

    async optimizeAudio(audioData) {
        // Implementa otimização de áudio (compressão, conversão de formato, etc)
        return audioData; // Por enquanto retorna sem otimização
    }

    async optimizeFont(fontData) {
        // Implementa otimização de fonte (subset, woff2, etc)
        return fontData; // Por enquanto retorna sem otimização
    }

    async collectScripts() {
        const scripts = [];

        // Engine core
        scripts.push({
            name: 'engine-core',
            content: await this.buildEngineCore()
        });

        // Game scripts
        const gameScripts = this.engine.scriptManager.getAllScripts();
        for (const script of gameScripts) {
            scripts.push({
                name: script.name,
                content: await this.processScript(script)
            });
        }

        return scripts;
    }

    async buildEngineCore() {
        // Combina e minifica os scripts do core do engine
        const coreScripts = [
            'core/engine.js',
            'core/renderer.js',
            'core/input.js',
            'core/physics.js',
            'core/audio.js',
            'core/scene.js'
        ];

        let combinedCode = '';
        for (const script of coreScripts) {
            const content = await fetch(script).then(r => r.text());
            combinedCode += content + '\\n';
        }

        return this.minifyCode(combinedCode);
    }

    async processScript(script) {
        let code = script.content;

        // Remove comentários e console.logs em produção
        code = code.replace(/\\/\\*[\\s\\S]*?\\*\\//g, '')
                   .replace(/\\/\\/[^\\n]*\\n/g, '')
                   .replace(/console\\.(log|debug|info)\\([^)]*\\);?/g, '');

        return this.minifyCode(code);
    }

    minifyCode(code) {
        // Implementa minificação básica
        return code
            .replace(/\\s+/g, ' ')
            .replace(/\\s*({|}|\\(|\\)|;|,)\\s*/g, '$1')
            .trim();
    }

    async collectStyles() {
        const styles = [];

        // Estilos do engine
        styles.push({
            name: 'engine-styles',
            content: await this.buildEngineStyles()
        });

        // Estilos do jogo
        const gameStyles = this.engine.styleManager.getAllStyles();
        for (const style of gameStyles) {
            styles.push({
                name: style.name,
                content: await this.processStyle(style)
            });
        }

        return styles;
    }

    async buildEngineStyles() {
        // Combina e minifica os estilos do engine
        const coreStyles = [
            'styles/engine.css',
            'styles/ui.css',
            'styles/animations.css'
        ];

        let combinedStyles = '';
        for (const style of coreStyles) {
            const content = await fetch(style).then(r => r.text());
            combinedStyles += content + '\\n';
        }

        return this.minifyCSS(combinedStyles);
    }

    async processStyle(style) {
        return this.minifyCSS(style.content);
    }

    minifyCSS(css) {
        // Implementa minificação básica de CSS
        return css
            .replace(/\\/\\*[\\s\\S]*?\\*\\//g, '')
            .replace(/\\s+/g, ' ')
            .replace(/\\s*({|}|;|,)\\s*/g, '$1')
            .trim();
    }

    getHtmlTemplate() {
        return \`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{GAME_NAME}}</title>
    {{STYLE_TAGS}}
    {{PWA_TAGS}}
</head>
<body>
    <div id="game-container"></div>
    {{SCRIPT_TAGS}}
    {{GAME_CONFIG}}
</body>
</html>\`;
    }

    getManifestTemplate() {
        return {
            "name": "{{GAME_NAME}}",
            "short_name": "{{GAME_SHORT_NAME}}",
            "start_url": "./",
            "display": "fullscreen",
            "orientation": "{{ORIENTATION}}",
            "background_color": "#000000",
            "theme_color": "#000000",
            "icons": [
                {
                    "src": "icons/icon-192.png",
                    "sizes": "192x192",
                    "type": "image/png"
                },
                {
                    "src": "icons/icon-512.png",
                    "sizes": "512x512",
                    "type": "image/png"
                }
            ]
        };
    }

    getServiceWorkerTemplate() {
        return \`
const CACHE_NAME = '{{GAME_NAME}}-v1';
const ASSETS = {{ASSET_LIST}};

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});\`;
    }

    async createExportPackage(options) {
        const package = {
            name: options.name,
            files: []
        };

        // HTML principal
        let html = this.templates.html;
        html = html.replace('{{GAME_NAME}}', options.name);
        html = html.replace('{{STYLE_TAGS}}', this.generateStyleTags(options.styles));
        html = html.replace('{{SCRIPT_TAGS}}', this.generateScriptTags(options.scripts));
        html = html.replace('{{GAME_CONFIG}}', this.generateGameConfig(options));

        if (options.progressive) {
            html = html.replace('{{PWA_TAGS}}', this.generatePWATags());
            
            // Manifest
            const manifest = JSON.stringify(
                this.templates.manifest
                    .replace('{{GAME_NAME}}', options.name)
                    .replace('{{GAME_SHORT_NAME}}', options.name)
                    .replace('{{ORIENTATION}}', options.orientation)
            );
            package.files.push({
                name: 'manifest.json',
                content: manifest
            });

            // Service Worker
            const sw = this.templates.serviceWorker
                .replace('{{GAME_NAME}}', options.name)
                .replace('{{ASSET_LIST}}', JSON.stringify(this.generateAssetList(options)));
            package.files.push({
                name: 'sw.js',
                content: sw
            });
        }

        // Adiciona todos os assets
        for (const type in options.assets) {
            for (const asset of options.assets[type]) {
                package.files.push({
                    name: \`assets/\${type}/\${asset.name}\`,
                    content: asset.data
                });
            }
        }

        return package;
    }

    generateStyleTags(styles) {
        return styles.map(style => 
            \`<link rel="stylesheet" href="styles/\${style.name}.css">\`
        ).join('\\n');
    }

    generateScriptTags(scripts) {
        return scripts.map(script =>
            \`<script src="scripts/\${script.name}.js"></script>\`
        ).join('\\n');
    }

    generateGameConfig(options) {
        const config = {
            name: options.name,
            orientation: options.orientation,
            assets: this.generateAssetManifest(options.assets)
        };

        return \`<script>
            window.GAME_CONFIG = \${JSON.stringify(config)};
        </script>\`;
    }

    generatePWATags() {
        return \`
    <link rel="manifest" href="manifest.json">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <link rel="apple-touch-icon" href="icons/icon-192.png">\`;
    }

    generateAssetManifest(assets) {
        const manifest = {};
        for (const type in assets) {
            manifest[type] = assets[type].map(asset => ({
                id: asset.id,
                name: asset.name,
                path: \`assets/\${type}/\${asset.name}\`,
                metadata: asset.metadata
            }));
        }
        return manifest;
    }

    generateAssetList(options) {
        const list = [
            './',
            './index.html',
            './manifest.json',
            './sw.js'
        ];

        // Adiciona scripts
        options.scripts.forEach(script => {
            list.push(\`./scripts/\${script.name}.js\`);
        });

        // Adiciona estilos
        options.styles.forEach(style => {
            list.push(\`./styles/\${style.name}.css\`);
        });

        // Adiciona assets
        for (const type in options.assets) {
            options.assets[type].forEach(asset => {
                list.push(\`./assets/\${type}/\${asset.name}\`);
            });
        }

        return list;
    }

    async generateExportFile(exportPackage) {
        // Cria um arquivo ZIP com todo o conteúdo
        const zip = new JSZip();

        // Adiciona todos os arquivos ao ZIP
        for (const file of exportPackage.files) {
            zip.file(file.name, file.content);
        }

        // Gera o arquivo ZIP
        const blob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 9
            }
        });

        // Faz o download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = \`\${exportPackage.name}.zip\`;
        a.click();
        URL.revokeObjectURL(url);
    }
}
