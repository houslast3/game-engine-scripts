class Input {
    constructor(engine) {
        this.engine = engine;
        this.keys = new Map();
        this.mousePosition = { x: 0, y: 0 };
        this.mouseButtons = new Map();
        this.touches = new Map();
        this.gamepadStates = new Map();
        
        // Aguarda o renderer estar pronto
        this.engine.events.on('engineReady', () => {
            const canvas = this.engine.renderer.canvas;
            
            // Eventos do teclado
            window.addEventListener('keydown', (e) => this.handleKeyDown(e));
            window.addEventListener('keyup', (e) => this.handleKeyUp(e));
            
            // Eventos do mouse
            canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
            canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
            canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
            
            // Eventos de touch
            canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
            canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
            canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
            
            // Eventos de gamepad
            window.addEventListener('gamepadconnected', (e) => this.handleGamepadConnected(e));
            window.addEventListener('gamepaddisconnected', (e) => this.handleGamepadDisconnected(e));
        });
    }

    // Teclado
    handleKeyDown(event) {
        this.keys.set(event.code, true);
        this.engine.events.emit('keyDown', event.code);
    }

    handleKeyUp(event) {
        this.keys.set(event.code, false);
        this.engine.events.emit('keyUp', event.code);
    }

    isKeyPressed(keyCode) {
        return this.keys.get(keyCode) || false;
    }

    // Mouse
    handleMouseMove(event) {
        const canvas = this.engine.renderer.canvas;
        const rect = canvas.getBoundingClientRect();
        const position = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
        
        this.mousePosition = position;
        this.engine.events.emit('mouseMove', position);
    }

    handleMouseDown(event) {
        this.mouseButtons.set(event.button, true);
        this.engine.events.emit('mouseDown', {
            button: event.button,
            position: this.mousePosition
        });
    }

    handleMouseUp(event) {
        this.mouseButtons.set(event.button, false);
        this.engine.events.emit('mouseUp', {
            button: event.button,
            position: this.mousePosition
        });
    }

    isMouseButtonPressed(button) {
        return this.mouseButtons.get(button) || false;
    }

    getMousePosition() {
        return { ...this.mousePosition };
    }

    // Touch
    handleTouchStart(event) {
        event.preventDefault();
        for (const touch of event.changedTouches) {
            this.touches.set(touch.identifier, {
                x: touch.clientX,
                y: touch.clientY
            });
        }
        this.engine.events.emit('touchStart', Array.from(this.touches.values()));
    }

    handleTouchMove(event) {
        event.preventDefault();
        for (const touch of event.changedTouches) {
            this.touches.set(touch.identifier, {
                x: touch.clientX,
                y: touch.clientY
            });
        }
        this.engine.events.emit('touchMove', Array.from(this.touches.values()));
    }

    handleTouchEnd(event) {
        event.preventDefault();
        for (const touch of event.changedTouches) {
            this.touches.delete(touch.identifier);
        }
        this.engine.events.emit('touchEnd', Array.from(this.touches.values()));
    }

    getTouches() {
        return Array.from(this.touches.values());
    }

    // Gamepad
    handleGamepadConnected(event) {
        this.gamepadStates.set(event.gamepad.index, event.gamepad);
        this.engine.events.emit('gamepadConnected', event.gamepad);
    }

    handleGamepadDisconnected(event) {
        this.gamepadStates.delete(event.gamepad.index);
        this.engine.events.emit('gamepadDisconnected', event.gamepad);
    }

    getGamepads() {
        return Array.from(navigator.getGamepads()).filter(Boolean);
    }

    update() {
        // Atualiza estado dos gamepads
        const gamepads = this.getGamepads();
        for (const gamepad of gamepads) {
            this.gamepadStates.set(gamepad.index, gamepad);
        }
    }

    // Utilitários
    getWorldMousePosition() {
        return this.engine.renderer.camera.screenToWorld(
            this.mousePosition.x,
            this.mousePosition.y
        );
    }
}

// Exporta a classe
window.Input = Input;
