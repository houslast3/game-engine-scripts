class SpriteManager {
    constructor(engine) {
        this.engine = engine;
        this.sprites = new Map();
        this.spritesheets = new Map();
        this.animations = new Map();
    }

    // Carregamento de sprites individuais
    async loadSprite(name, url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.sprites.set(name, {
                    image: img,
                    width: img.width,
                    height: img.height
                });
                resolve(this.sprites.get(name));
            };
            img.onerror = reject;
            img.src = url;
        });
    }

    // Carregamento de spritesheets
    async loadSpritesheet(name, url, frameWidth, frameHeight) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const spritesheet = {
                    image: img,
                    frameWidth,
                    frameHeight,
                    framesPerRow: Math.floor(img.width / frameWidth),
                    totalFrames: Math.floor((img.width / frameWidth) * (img.height / frameHeight)),
                    frames: []
                };

                // Pré-calcula os frames
                for (let y = 0; y < img.height; y += frameHeight) {
                    for (let x = 0; x < img.width; x += frameWidth) {
                        spritesheet.frames.push({
                            x, y,
                            width: frameWidth,
                            height: frameHeight
                        });
                    }
                }

                this.spritesheets.set(name, spritesheet);
                resolve(spritesheet);
            };
            img.onerror = reject;
            img.src = url;
        });
    }

    // Criação de animação a partir de spritesheet
    createAnimation(name, spritesheetName, frameIndices, frameRate) {
        const spritesheet = this.spritesheets.get(spritesheetName);
        if (!spritesheet) return null;

        const animation = {
            spritesheet,
            frameIndices,
            frameRate,
            duration: (frameIndices.length / frameRate) * 1000, // duração em ms
            currentFrame: 0,
            currentTime: 0,
            isPlaying: false,
            loop: true
        };

        this.animations.set(name, animation);
        return animation;
    }

    // Atualiza uma animação
    updateAnimation(animation, deltaTime) {
        if (!animation.isPlaying) return;

        animation.currentTime += deltaTime * 1000; // converte para ms

        if (animation.currentTime >= animation.duration) {
            if (animation.loop) {
                animation.currentTime = animation.currentTime % animation.duration;
            } else {
                animation.currentTime = animation.duration;
                animation.isPlaying = false;
                if (animation.onComplete) animation.onComplete();
                return;
            }
        }

        const frameNumber = Math.floor((animation.currentTime / animation.duration) * animation.frameIndices.length);
        animation.currentFrame = animation.frameIndices[frameNumber];
    }

    // Desenha um sprite
    drawSprite(ctx, spriteName, x, y, options = {}) {
        const sprite = this.sprites.get(spriteName);
        if (!sprite) return;

        const {
            width = sprite.width,
            height = sprite.height,
            rotation = 0,
            scale = 1,
            alpha = 1,
            flipX = false,
            flipY = false
        } = options;

        ctx.save();
        
        // Aplica transformações
        ctx.translate(x + width/2, y + height/2);
        ctx.rotate(rotation);
        ctx.scale(flipX ? -scale : scale, flipY ? -scale : scale);
        ctx.globalAlpha = alpha;

        // Desenha o sprite
        ctx.drawImage(
            sprite.image,
            -width/2, -height/2,
            width, height
        );

        ctx.restore();
    }

    // Desenha um frame de spritesheet
    drawFrame(ctx, spritesheetName, frameIndex, x, y, options = {}) {
        const spritesheet = this.spritesheets.get(spritesheetName);
        if (!spritesheet || !spritesheet.frames[frameIndex]) return;

        const frame = spritesheet.frames[frameIndex];
        const {
            width = spritesheet.frameWidth,
            height = spritesheet.frameHeight,
            rotation = 0,
            scale = 1,
            alpha = 1,
            flipX = false,
            flipY = false
        } = options;

        ctx.save();
        
        // Aplica transformações
        ctx.translate(x + width/2, y + height/2);
        ctx.rotate(rotation);
        ctx.scale(flipX ? -scale : scale, flipY ? -scale : scale);
        ctx.globalAlpha = alpha;

        // Desenha o frame
        ctx.drawImage(
            spritesheet.image,
            frame.x, frame.y,
            frame.width, frame.height,
            -width/2, -height/2,
            width, height
        );

        ctx.restore();
    }

    // Desenha um frame de uma animação
    drawAnimation(ctx, animationName, x, y, options = {}) {
        const animation = this.animations.get(animationName);
        if (!animation) return;

        this.drawFrame(
            ctx,
            animation.spritesheet,
            animation.frameIndices[animation.currentFrame],
            x, y,
            options
        );
    }

    // Controles de animação
    playAnimation(name, loop = true) {
        const animation = this.animations.get(name);
        if (animation) {
            animation.isPlaying = true;
            animation.loop = loop;
            animation.currentTime = 0;
            animation.currentFrame = animation.frameIndices[0];
        }
    }

    pauseAnimation(name) {
        const animation = this.animations.get(name);
        if (animation) {
            animation.isPlaying = false;
        }
    }

    resumeAnimation(name) {
        const animation = this.animations.get(name);
        if (animation) {
            animation.isPlaying = true;
        }
    }

    stopAnimation(name) {
        const animation = this.animations.get(name);
        if (animation) {
            animation.isPlaying = false;
            animation.currentTime = 0;
            animation.currentFrame = animation.frameIndices[0];
        }
    }

    // Getters úteis
    getSprite(name) {
        return this.sprites.get(name);
    }

    getSpritesheet(name) {
        return this.spritesheets.get(name);
    }

    getAnimation(name) {
        return this.animations.get(name);
    }
}
