class Timeline {
    constructor(engine) {
        this.engine = engine;
        this.element = document.createElement('div');
        this.element.className = 'timeline-panel';
        this.currentTime = 0;
        this.duration = 10000; // 10 segundos por padrão
        this.zoom = 1;
        this.tracks = new Map();
        this.selectedKeyframe = null;
        this.isDragging = false;
        this.isPlaying = false;
        this.playbackStartTime = 0;
        
        this.setupPanel();
        this.setupEventListeners();
        this.startPlaybackLoop();
    }

    setupPanel() {
        this.element.innerHTML = `
            <div class="panel-header">
                <h3>Timeline</h3>
                <div class="panel-actions">
                    <button class="play-btn">▶️</button>
                    <button class="stop-btn">⏹️</button>
                    <button class="add-track-btn">+</button>
                </div>
            </div>
            <div class="timeline-toolbar">
                <input type="range" class="zoom-slider" min="0.1" max="2" step="0.1" value="1">
                <span class="current-time">00:00.000</span>
            </div>
            <div class="timeline-content">
                <div class="timeline-tracks">
                    <div class="track-headers"></div>
                    <div class="track-content">
                        <div class="time-ruler"></div>
                        <div class="tracks-container"></div>
                    </div>
                </div>
            </div>
        `;

        this.updateTimeRuler();
        this.setupPlaybackControls();
    }

    setupEventListeners() {
        // Zoom
        const zoomSlider = this.element.querySelector('.zoom-slider');
        zoomSlider.addEventListener('input', () => {
            this.zoom = parseFloat(zoomSlider.value);
            this.updateTimeRuler();
            this.updateTracks();
        });

        // Clique na timeline
        const trackContent = this.element.querySelector('.track-content');
        trackContent.addEventListener('click', (e) => {
            if (e.target.classList.contains('track-content')) {
                const rect = trackContent.getBoundingClientRect();
                const x = e.clientX - rect.left;
                this.currentTime = this.xToTime(x);
                this.updatePlayhead();
            }
        });

        // Drag de keyframes
        trackContent.addEventListener('mousedown', (e) => {
            const keyframe = e.target.closest('.keyframe');
            if (keyframe) {
                this.isDragging = true;
                this.selectedKeyframe = keyframe;
                keyframe.classList.add('dragging');
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging && this.selectedKeyframe) {
                const rect = trackContent.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const time = this.xToTime(x);
                this.updateKeyframeTime(this.selectedKeyframe, time);
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.isDragging && this.selectedKeyframe) {
                this.selectedKeyframe.classList.remove('dragging');
                this.isDragging = false;
                this.selectedKeyframe = null;
            }
        });
    }

    setupPlaybackControls() {
        const playBtn = this.element.querySelector('.play-btn');
        const stopBtn = this.element.querySelector('.stop-btn');

        playBtn.addEventListener('click', () => {
            if (this.isPlaying) {
                this.pause();
                playBtn.textContent = '▶️';
            } else {
                this.play();
                playBtn.textContent = '⏸️';
            }
        });

        stopBtn.addEventListener('click', () => {
            this.stop();
            playBtn.textContent = '▶️';
        });
    }

    startPlaybackLoop() {
        const loop = () => {
            if (this.isPlaying) {
                const currentTime = performance.now();
                const deltaTime = currentTime - this.playbackStartTime;
                this.currentTime = (this.currentTime + deltaTime) % this.duration;
                this.playbackStartTime = currentTime;
                this.updatePlayhead();
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    play() {
        this.isPlaying = true;
        this.playbackStartTime = performance.now();
    }

    pause() {
        this.isPlaying = false;
    }

    stop() {
        this.isPlaying = false;
        this.currentTime = 0;
        this.updatePlayhead();
    }

    updateTimeRuler() {
        const ruler = this.element.querySelector('.time-ruler');
        const pixelsPerSecond = 100 * this.zoom;
        const totalWidth = (this.duration / 1000) * pixelsPerSecond;
        
        let html = '';
        for (let i = 0; i <= this.duration; i += 1000) {
            const x = (i / 1000) * pixelsPerSecond;
            html += `
                <div class="time-marker" style="left: ${x}px">
                    ${this.formatTime(i)}
                </div>
            `;
        }
        
        ruler.style.width = totalWidth + 'px';
        ruler.innerHTML = html;
    }

    updatePlayhead() {
        const playhead = this.element.querySelector('.playhead') || 
                        this.createPlayhead();
        
        playhead.style.left = this.timeToX(this.currentTime) + 'px';
        
        const timeDisplay = this.element.querySelector('.current-time');
        timeDisplay.textContent = this.formatTime(this.currentTime);
    }

    createPlayhead() {
        const playhead = document.createElement('div');
        playhead.className = 'playhead';
        this.element.querySelector('.track-content').appendChild(playhead);
        return playhead;
    }

    addTrack(name, type = 'property') {
        const track = {
            id: Date.now(),
            name,
            type,
            keyframes: new Map()
        };

        this.tracks.set(track.id, track);
        this.updateTracks();
        return track;
    }

    addKeyframe(trackId, time, value) {
        const track = this.tracks.get(trackId);
        if (!track) return;

        const keyframe = {
            id: Date.now(),
            time,
            value,
            easing: 'linear'
        };

        track.keyframes.set(keyframe.id, keyframe);
        this.updateTracks();
        return keyframe;
    }

    updateKeyframeTime(keyframeElement, time) {
        const trackId = parseInt(keyframeElement.closest('.track').dataset.trackId);
        const keyframeId = parseInt(keyframeElement.dataset.keyframeId);
        
        const track = this.tracks.get(trackId);
        const keyframe = track?.keyframes.get(keyframeId);
        
        if (keyframe) {
            keyframe.time = Math.max(0, Math.min(time, this.duration));
            keyframeElement.style.left = this.timeToX(keyframe.time) + 'px';
        }
    }

    updateTracks() {
        const container = this.element.querySelector('.tracks-container');
        const headers = this.element.querySelector('.track-headers');
        
        // Atualiza headers
        headers.innerHTML = Array.from(this.tracks.values()).map(track => `
            <div class="track-header" data-track-id="${track.id}">
                <div class="track-name">${track.name}</div>
                <div class="track-controls">
                    <button class="track-visibility">👁️</button>
                    <button class="track-lock">🔒</button>
                </div>
            </div>
        `).join('');

        // Atualiza tracks
        container.innerHTML = Array.from(this.tracks.values()).map(track => `
            <div class="track" data-track-id="${track.id}">
                ${Array.from(track.keyframes.values()).map(keyframe => `
                    <div class="keyframe" 
                         data-keyframe-id="${keyframe.id}"
                         style="left: ${this.timeToX(keyframe.time)}px">
                        ◆
                    </div>
                `).join('')}
            </div>
        `).join('');
    }

    timeToX(time) {
        return (time / 1000) * (100 * this.zoom);
    }

    xToTime(x) {
        return (x / (100 * this.zoom)) * 1000;
    }

    formatTime(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = ms % 1000;
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }

    getCurrentTime() {
        return this.currentTime;
    }

    getDuration() {
        return this.duration;
    }

    setDuration(duration) {
        this.duration = duration;
        this.updateTimeRuler();
    }

    getTrackValue(trackId, time) {
        const track = this.tracks.get(trackId);
        if (!track) return null;

        // Encontra os keyframes antes e depois do tempo atual
        const keyframes = Array.from(track.keyframes.values())
            .sort((a, b) => a.time - b.time);
        
        const prevKeyframe = keyframes.reduce((prev, curr) => 
            curr.time <= time && (!prev || curr.time > prev.time) ? curr : prev
        , null);
        
        const nextKeyframe = keyframes.reduce((next, curr) => 
            curr.time > time && (!next || curr.time < next.time) ? curr : next
        , null);

        if (!prevKeyframe) return nextKeyframe?.value ?? null;
        if (!nextKeyframe) return prevKeyframe.value;

        // Interpola entre os keyframes
        const t = (time - prevKeyframe.time) / (nextKeyframe.time - prevKeyframe.time);
        return this.interpolateValue(prevKeyframe.value, nextKeyframe.value, t, prevKeyframe.easing);
    }

    interpolateValue(start, end, t, easing = 'linear') {
        // Aplica a função de easing
        const easedT = this.getEasingFunction(easing)(t);

        // Interpola baseado no tipo de valor
        if (typeof start === 'number' && typeof end === 'number') {
            return start + (end - start) * easedT;
        }
        
        if (typeof start === 'string' && start.startsWith('#') && 
            typeof end === 'string' && end.startsWith('#')) {
            return this.interpolateColor(start, end, easedT);
        }
        
        if (Array.isArray(start) && Array.isArray(end)) {
            return start.map((s, i) => s + (end[i] - s) * easedT);
        }

        return easedT < 0.5 ? start : end;
    }

    getEasingFunction(easing) {
        const easings = {
            linear: t => t,
            easeInQuad: t => t * t,
            easeOutQuad: t => t * (2 - t),
            easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
            easeInCubic: t => t * t * t,
            easeOutCubic: t => (--t) * t * t + 1,
            easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
        };
        return easings[easing] || easings.linear;
    }

    interpolateColor(color1, color2, t) {
        const hex1 = color1.replace('#', '');
        const hex2 = color2.replace('#', '');

        const r1 = parseInt(hex1.substr(0, 2), 16);
        const g1 = parseInt(hex1.substr(2, 2), 16);
        const b1 = parseInt(hex1.substr(4, 2), 16);

        const r2 = parseInt(hex2.substr(0, 2), 16);
        const g2 = parseInt(hex2.substr(2, 2), 16);
        const b2 = parseInt(hex2.substr(4, 2), 16);

        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);

        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
}
