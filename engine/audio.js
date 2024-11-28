class Audio {
    constructor(engine) {
        this.engine = engine;
        this.context = null;
        this.masterGain = null;
        this.sounds = new Map();
        this.music = new Map();
        this.currentMusic = null;
        
        // Configurações
        this.config = {
            enabled: true,
            masterVolume: 1.0,
            soundVolume: 1.0,
            musicVolume: 1.0
        };
        
        // Inicializa quando pronto
        this.engine.events.on('engineReady', () => this.init());
    }

    init() {
        try {
            // Cria o contexto de áudio
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.context.createGain();
            this.masterGain.connect(this.context.destination);
            
            // Configura volume inicial
            this.setMasterVolume(this.config.masterVolume);
            
            // Emite evento de inicialização
            this.engine.events.emit('audioReady');
        } catch (error) {
            console.error('Erro ao inicializar sistema de áudio:', error);
            this.engine.events.emit('audioError', error);
        }
    }

    async loadSound(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
            
            this.sounds.set(name, {
                buffer: audioBuffer,
                volume: 1.0,
                instances: []
            });
            
            this.engine.events.emit('soundLoaded', name);
            return true;
        } catch (error) {
            console.error(`Erro ao carregar som ${name}:`, error);
            this.engine.events.emit('soundError', { name, error });
            return false;
        }
    }

    async loadMusic(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
            
            this.music.set(name, {
                buffer: audioBuffer,
                volume: 1.0,
                source: null,
                gainNode: null
            });
            
            this.engine.events.emit('musicLoaded', name);
            return true;
        } catch (error) {
            console.error(`Erro ao carregar música ${name}:`, error);
            this.engine.events.emit('musicError', { name, error });
            return false;
        }
    }

    playSound(name, options = {}) {
        if (!this.config.enabled) return null;
        
        const sound = this.sounds.get(name);
        if (!sound) {
            console.error(`Som ${name} não encontrado`);
            return null;
        }

        // Cria nós de áudio
        const source = this.context.createBufferSource();
        const gainNode = this.context.createGain();
        
        // Configura fonte
        source.buffer = sound.buffer;
        
        // Configura opções
        const {
            loop = false,
            volume = sound.volume,
            playbackRate = 1.0,
            pan = 0
        } = options;
        
        source.loop = loop;
        source.playbackRate.value = playbackRate;
        
        // Configura volume
        gainNode.gain.value = volume * this.config.soundVolume;
        
        // Configura pan se necessário
        let panNode = null;
        if (pan !== 0) {
            panNode = this.context.createStereoPanner();
            panNode.pan.value = Math.max(-1, Math.min(1, pan));
        }
        
        // Conecta nós
        source.connect(gainNode);
        if (panNode) {
            gainNode.connect(panNode);
            panNode.connect(this.masterGain);
        } else {
            gainNode.connect(this.masterGain);
        }
        
        // Inicia playback
        source.start(0);
        
        // Armazena instância
        const instance = {
            source,
            gainNode,
            panNode,
            volume,
            startTime: this.context.currentTime
        };
        
        sound.instances.push(instance);
        
        // Remove instância quando terminar
        source.onended = () => {
            const index = sound.instances.indexOf(instance);
            if (index !== -1) {
                sound.instances.splice(index, 1);
            }
            this.engine.events.emit('soundEnded', name);
        };
        
        this.engine.events.emit('soundStarted', name);
        return instance;
    }

    playMusic(name, options = {}) {
        if (!this.config.enabled) return;
        
        const music = this.music.get(name);
        if (!music) {
            console.error(`Música ${name} não encontrada`);
            return;
        }

        // Para música atual se existir
        this.stopMusic();

        // Cria nós de áudio
        const source = this.context.createBufferSource();
        const gainNode = this.context.createGain();
        
        // Configura fonte
        source.buffer = music.buffer;
        
        // Configura opções
        const {
            loop = true,
            volume = music.volume,
            fadeIn = 0
        } = options;
        
        source.loop = loop;
        
        // Configura volume
        if (fadeIn > 0) {
            gainNode.gain.value = 0;
            gainNode.gain.linearRampToValueAtTime(
                volume * this.config.musicVolume,
                this.context.currentTime + fadeIn
            );
        } else {
            gainNode.gain.value = volume * this.config.musicVolume;
        }
        
        // Conecta nós
        source.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        // Inicia playback
        source.start(0);
        
        // Armazena referência
        music.source = source;
        music.gainNode = gainNode;
        this.currentMusic = name;
        
        // Configura callback de fim
        source.onended = () => {
            if (this.currentMusic === name) {
                this.currentMusic = null;
                music.source = null;
                music.gainNode = null;
            }
            this.engine.events.emit('musicEnded', name);
        };
        
        this.engine.events.emit('musicStarted', name);
    }

    stopSound(name) {
        const sound = this.sounds.get(name);
        if (!sound) return;
        
        // Para todas as instâncias
        for (const instance of sound.instances) {
            instance.source.stop();
        }
        
        // Limpa lista de instâncias
        sound.instances = [];
        
        this.engine.events.emit('soundStopped', name);
    }

    stopMusic(fadeOut = 0) {
        if (!this.currentMusic) return;
        
        const music = this.music.get(this.currentMusic);
        if (!music || !music.source) return;
        
        const name = this.currentMusic;
        
        if (fadeOut > 0) {
            // Fade out
            music.gainNode.gain.linearRampToValueAtTime(
                0,
                this.context.currentTime + fadeOut
            );
            
            // Para após fade
            setTimeout(() => {
                if (music.source) {
                    music.source.stop();
                    music.source = null;
                    music.gainNode = null;
                }
            }, fadeOut * 1000);
        } else {
            // Para imediatamente
            music.source.stop();
            music.source = null;
            music.gainNode = null;
        }
        
        this.currentMusic = null;
        this.engine.events.emit('musicStopped', name);
    }

    setMasterVolume(volume) {
        this.config.masterVolume = Math.max(0, Math.min(1, volume));
        this.masterGain.gain.value = this.config.masterVolume;
        this.engine.events.emit('volumeChanged', { type: 'master', value: volume });
    }

    setSoundVolume(volume) {
        this.config.soundVolume = Math.max(0, Math.min(1, volume));
        
        // Atualiza volume de todos os sons ativos
        for (const [name, sound] of this.sounds) {
            for (const instance of sound.instances) {
                instance.gainNode.gain.value = instance.volume * this.config.soundVolume;
            }
        }
        
        this.engine.events.emit('volumeChanged', { type: 'sound', value: volume });
    }

    setMusicVolume(volume) {
        this.config.musicVolume = Math.max(0, Math.min(1, volume));
        
        // Atualiza volume da música atual
        if (this.currentMusic) {
            const music = this.music.get(this.currentMusic);
            if (music && music.gainNode) {
                music.gainNode.gain.value = music.volume * this.config.musicVolume;
            }
        }
        
        this.engine.events.emit('volumeChanged', { type: 'music', value: volume });
    }

    pauseAll() {
        if (this.context.state === 'running') {
            this.context.suspend();
            this.engine.events.emit('audioPaused');
        }
    }

    resumeAll() {
        if (this.context.state === 'suspended') {
            this.context.resume();
            this.engine.events.emit('audioResumed');
        }
    }
}

// Exporta a classe
window.Audio = Audio;
