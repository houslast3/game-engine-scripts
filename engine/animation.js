class Animation {
    constructor(engine) {
        this.engine = engine;
        this.animations = new Map();
        this.activeAnimations = new Set();
        this.lastTime = 0;
        
        // Funções de easing padrão
        this.easingFunctions = {
            linear: t => t,
            easeInQuad: t => t * t,
            easeOutQuad: t => t * (2 - t),
            easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
            easeInCubic: t => t * t * t,
            easeOutCubic: t => (--t) * t * t + 1,
            easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
            easeInElastic: t => (.04 - .04 / t) * Math.sin(25 * t) + 1,
            easeOutElastic: t => .04 * t / (--t) * Math.sin(25 * t),
            easeInOutElastic: t => (t -= .5) < 0 ? (.02 + .01 / t) * Math.sin(50 * t) : (.02 - .01 / t) * Math.sin(50 * t) + 1
        };
    }

    createAnimation(name, keyframes, options = {}) {
        const {
            duration = 1000,
            easing = 'linear',
            delay = 0,
            loop = false,
            alternate = false,
            autoplay = false
        } = options;

        const animation = {
            name,
            keyframes,
            duration,
            easing: this.easingFunctions[easing] || this.easingFunctions.linear,
            delay,
            loop,
            alternate,
            autoplay
        };

        this.animations.set(name, animation);
        this.engine.events.emit('animationCreated', { name });
        
        return animation;
    }

    play(target, animationName, options = {}) {
        const animation = this.animations.get(animationName);
        if (!animation) {
            console.error(`Animation not found: ${animationName}`);
            return null;
        }

        const instance = {
            id: Math.random().toString(36).substr(2, 9),
            target,
            animation: { ...animation },
            startTime: this.lastTime + (options.delay || animation.delay),
            currentTime: 0,
            progress: 0,
            isPlaying: true,
            isPaused: false,
            direction: 1,
            iteration: 0,
            ...options
        };

        this.activeAnimations.add(instance);
        this.engine.events.emit('animationStarted', {
            name: animationName,
            target,
            instance: instance.id
        });

        return instance;
    }

    pause(instance) {
        if (instance && instance.isPlaying) {
            instance.isPaused = true;
            instance.isPlaying = false;
            this.engine.events.emit('animationPaused', {
                name: instance.animation.name,
                instance: instance.id
            });
        }
    }

    resume(instance) {
        if (instance && instance.isPaused) {
            instance.isPaused = false;
            instance.isPlaying = true;
            instance.startTime = this.lastTime - instance.currentTime;
            this.engine.events.emit('animationResumed', {
                name: instance.animation.name,
                instance: instance.id
            });
        }
    }

    stop(instance) {
        if (instance) {
            this.activeAnimations.delete(instance);
            this.engine.events.emit('animationStopped', {
                name: instance.animation.name,
                instance: instance.id
            });
        }
    }

    update(deltaTime) {
        this.lastTime += deltaTime * 1000; // Converte para milissegundos

        for (const instance of this.activeAnimations) {
            if (!instance.isPlaying || instance.isPaused) continue;

            const elapsed = this.lastTime - instance.startTime;
            instance.currentTime = elapsed * (instance.speed || 1);

            // Calcula o progresso normalizado (0 a 1)
            let progress = Math.min(instance.currentTime / instance.animation.duration, 1);

            // Aplica easing
            progress = instance.animation.easing(progress);

            // Atualiza propriedades
            this.updateProperties(instance, progress);

            // Verifica se a animação terminou
            if (progress >= 1) {
                if (instance.animation.loop) {
                    instance.iteration++;
                    instance.startTime = this.lastTime;
                    if (instance.animation.alternate) {
                        instance.direction *= -1;
                    }
                    this.engine.events.emit('animationLooped', {
                        name: instance.animation.name,
                        instance: instance.id,
                        iteration: instance.iteration
                    });
                } else {
                    this.stop(instance);
                    this.engine.events.emit('animationCompleted', {
                        name: instance.animation.name,
                        instance: instance.id
                    });
                }
            }
        }
    }

    updateProperties(instance, progress) {
        const { keyframes } = instance.animation;
        const { target } = instance;

        // Se a direção for reversa, inverte o progresso
        if (instance.direction === -1) {
            progress = 1 - progress;
        }

        // Interpola valores entre keyframes
        for (const [property, frames] of Object.entries(keyframes)) {
            const sortedFrames = Object.entries(frames).sort(([a], [b]) => Number(a) - Number(b));
            
            // Encontra os frames antes e depois do progresso atual
            let beforeFrame = sortedFrames[0];
            let afterFrame = sortedFrames[sortedFrames.length - 1];
            
            for (let i = 0; i < sortedFrames.length - 1; i++) {
                const [time1] = sortedFrames[i];
                const [time2] = sortedFrames[i + 1];
                
                if (progress >= Number(time1) / 100 && progress <= Number(time2) / 100) {
                    beforeFrame = sortedFrames[i];
                    afterFrame = sortedFrames[i + 1];
                    break;
                }
            }
            
            const [beforeTime, beforeValue] = beforeFrame;
            const [afterTime, afterValue] = afterFrame;
            
            // Calcula o progresso entre os dois frames
            const frameProgress = (progress - Number(beforeTime) / 100) / 
                                (Number(afterTime) / 100 - Number(beforeTime) / 100);
            
            // Interpola o valor
            const value = this.interpolateValue(beforeValue, afterValue, frameProgress);
            
            // Atualiza a propriedade no objeto alvo
            this.setPropertyValue(target, property, value);
        }
        
        // Emite evento de atualização
        this.engine.events.emit('animationUpdated', {
            name: instance.animation.name,
            instance: instance.id,
            progress
        });
    }

    interpolateValue(start, end, progress) {
        if (typeof start === 'number' && typeof end === 'number') {
            return start + (end - start) * progress;
        } else if (Array.isArray(start) && Array.isArray(end)) {
            return start.map((s, i) => this.interpolateValue(s, end[i], progress));
        } else if (typeof start === 'string' && typeof end === 'string') {
            // Suporte para cores em formato hex
            if (start.startsWith('#') && end.startsWith('#')) {
                const startRGB = this.hexToRGB(start);
                const endRGB = this.hexToRGB(end);
                const r = Math.round(this.interpolateValue(startRGB[0], endRGB[0], progress));
                const g = Math.round(this.interpolateValue(startRGB[1], endRGB[1], progress));
                const b = Math.round(this.interpolateValue(startRGB[2], endRGB[2], progress));
                return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            }
            return progress < 0.5 ? start : end;
        }
        return end;
    }

    setPropertyValue(target, property, value) {
        const props = property.split('.');
        let current = target;
        
        for (let i = 0; i < props.length - 1; i++) {
            current = current[props[i]];
            if (!current) return;
        }
        
        current[props[props.length - 1]] = value;
    }

    hexToRGB(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    }

    // API Pública
    getAnimation(name) {
        return this.animations.get(name);
    }

    removeAnimation(name) {
        const animation = this.animations.get(name);
        if (animation) {
            // Para todas as instâncias ativas desta animação
            for (const instance of this.activeAnimations) {
                if (instance.animation.name === name) {
                    this.stop(instance);
                }
            }
            this.animations.delete(name);
            this.engine.events.emit('animationRemoved', { name });
            return true;
        }
        return false;
    }

    clear() {
        this.animations.clear();
        this.activeAnimations.clear();
        this.engine.events.emit('animationsCleared');
    }
}

// Exporta a classe
window.Animation = Animation;
