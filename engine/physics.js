class Physics {
    constructor(engine) {
        this.engine = engine;
        this.gravity = engine.config.gravity || 9.8;
        this.bodies = new Set();
        this.colliders = new Set();
        this.quadTree = null;
        
        // Eventos
        this.engine.events.on('engineReady', () => this.updateQuadTree());
    }

    updateQuadTree() {
        // Cria uma nova QuadTree baseada no tamanho do viewport
        const bounds = {
            x: 0,
            y: 0,
            width: this.engine.renderer.viewport.width,
            height: this.engine.renderer.viewport.height
        };
        this.quadTree = new QuadTree(bounds, 10); // Max 10 objetos por nó
    }

    addBody(body) {
        this.bodies.add(body);
        if (body.collider) {
            this.colliders.add(body);
        }
        this.engine.events.emit('bodyAdded', body);
    }

    removeBody(body) {
        this.bodies.delete(body);
        if (body.collider) {
            this.colliders.delete(body);
        }
        this.engine.events.emit('bodyRemoved', body);
    }

    update(deltaTime) {
        // Atualiza a QuadTree
        this.quadTree.clear();
        for (const body of this.colliders) {
            this.quadTree.insert(body);
        }

        // Atualiza todos os corpos físicos
        for (const body of this.bodies) {
            if (body.isStatic) continue;

            // Aplica gravidade
            if (body.useGravity) {
                body.velocity.y += this.gravity * deltaTime;
            }

            // Atualiza posição
            body.x += body.velocity.x * deltaTime;
            body.y += body.velocity.y * deltaTime;

            // Verifica colisões
            if (body.collider) {
                const potentialCollisions = this.quadTree.retrieve(body);
                for (const other of potentialCollisions) {
                    if (body === other) continue;
                    
                    if (this.checkCollision(body, other)) {
                        this.resolveCollision(body, other);
                        
                        // Emite evento de colisão
                        this.engine.events.emit('collision', {
                            bodyA: body,
                            bodyB: other
                        });
                    }
                }
            }

            // Aplica amortecimento
            if (body.damping) {
                body.velocity.x *= (1 - body.damping * deltaTime);
                body.velocity.y *= (1 - body.damping * deltaTime);
            }

            // Limita velocidade máxima
            if (body.maxVelocity) {
                const speed = Math.sqrt(body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y);
                if (speed > body.maxVelocity) {
                    const scale = body.maxVelocity / speed;
                    body.velocity.x *= scale;
                    body.velocity.y *= scale;
                }
            }
        }
    }

    checkCollision(bodyA, bodyB) {
        // Verifica colisão entre retângulos (AABB)
        return !(
            bodyA.x + bodyA.width < bodyB.x ||
            bodyA.x > bodyB.x + bodyB.width ||
            bodyA.y + bodyA.height < bodyB.y ||
            bodyA.y > bodyB.y + bodyB.height
        );
    }

    resolveCollision(bodyA, bodyB) {
        // Se um dos corpos é estático, apenas o outro se move
        if (bodyA.isStatic && bodyB.isStatic) return;

        // Calcula normal da colisão
        const dx = (bodyA.x + bodyA.width/2) - (bodyB.x + bodyB.width/2);
        const dy = (bodyA.y + bodyA.height/2) - (bodyB.y + bodyB.height/2);
        const angle = Math.atan2(dy, dx);

        // Calcula velocidades relativas
        const relativeVelocityX = bodyA.velocity.x - (bodyB.isStatic ? 0 : bodyB.velocity.x);
        const relativeVelocityY = bodyA.velocity.y - (bodyB.isStatic ? 0 : bodyB.velocity.y);

        // Calcula velocidade relativa ao longo da normal
        const relativeVelocity = relativeVelocityX * Math.cos(angle) + relativeVelocityY * Math.sin(angle);

        // Se os objetos já estão se afastando, não faz nada
        if (relativeVelocity > 0) return;

        // Calcula impulso
        const restitution = Math.min(bodyA.restitution || 0.2, bodyB.restitution || 0.2);
        const impulse = -(1 + restitution) * relativeVelocity;
        const massSum = (1 / (bodyA.isStatic ? Infinity : bodyA.mass)) + (1 / (bodyB.isStatic ? Infinity : bodyB.mass));
        const impulseMagnitude = impulse / massSum;

        // Aplica impulso
        if (!bodyA.isStatic) {
            bodyA.velocity.x += impulseMagnitude * Math.cos(angle) / bodyA.mass;
            bodyA.velocity.y += impulseMagnitude * Math.sin(angle) / bodyA.mass;
        }

        if (!bodyB.isStatic) {
            bodyB.velocity.x -= impulseMagnitude * Math.cos(angle) / bodyB.mass;
            bodyB.velocity.y -= impulseMagnitude * Math.sin(angle) / bodyB.mass;
        }

        // Corrige sobreposição
        const overlap = 0.5; // Fator de correção de sobreposição
        const correction = Math.max(0.01, Math.min(0.5, overlap)); // Limita a correção

        const totalMass = (bodyA.isStatic ? Infinity : bodyA.mass) + (bodyB.isStatic ? Infinity : bodyB.mass);
        const percent = correction / totalMass;

        if (!bodyA.isStatic) {
            bodyA.x += dx * percent * bodyB.mass;
            bodyA.y += dy * percent * bodyB.mass;
        }

        if (!bodyB.isStatic) {
            bodyB.x -= dx * percent * bodyA.mass;
            bodyB.y -= dy * percent * bodyA.mass;
        }
    }
}

// Classe QuadTree para otimização de colisões
class QuadTree {
    constructor(bounds, maxObjects) {
        this.bounds = bounds;
        this.maxObjects = maxObjects;
        this.objects = [];
        this.nodes = [];
    }

    clear() {
        this.objects = [];
        for (let i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i]) {
                this.nodes[i].clear();
            }
        }
        this.nodes = [];
    }

    split() {
        const subWidth = this.bounds.width / 2;
        const subHeight = this.bounds.height / 2;
        const x = this.bounds.x;
        const y = this.bounds.y;

        this.nodes[0] = new QuadTree({
            x: x + subWidth,
            y: y,
            width: subWidth,
            height: subHeight
        }, this.maxObjects);

        this.nodes[1] = new QuadTree({
            x: x,
            y: y,
            width: subWidth,
            height: subHeight
        }, this.maxObjects);

        this.nodes[2] = new QuadTree({
            x: x,
            y: y + subHeight,
            width: subWidth,
            height: subHeight
        }, this.maxObjects);

        this.nodes[3] = new QuadTree({
            x: x + subWidth,
            y: y + subHeight,
            width: subWidth,
            height: subHeight
        }, this.maxObjects);
    }

    getIndex(rect) {
        const indexes = [];
        const verticalMidpoint = this.bounds.x + (this.bounds.width / 2);
        const horizontalMidpoint = this.bounds.y + (this.bounds.height / 2);

        const topQuadrant = (rect.y < horizontalMidpoint && rect.y + rect.height < horizontalMidpoint);
        const bottomQuadrant = (rect.y > horizontalMidpoint);

        if (rect.x < verticalMidpoint && rect.x + rect.width < verticalMidpoint) {
            if (topQuadrant) {
                indexes.push(1);
            }
            if (bottomQuadrant) {
                indexes.push(2);
            }
        }
        if (rect.x > verticalMidpoint) {
            if (topQuadrant) {
                indexes.push(0);
            }
            if (bottomQuadrant) {
                indexes.push(3);
            }
        }

        return indexes;
    }

    insert(rect) {
        if (this.nodes.length) {
            const indexes = this.getIndex(rect);
            for (const index of indexes) {
                this.nodes[index].insert(rect);
            }
            return;
        }

        this.objects.push(rect);

        if (this.objects.length > this.maxObjects && !this.nodes.length) {
            this.split();
            
            for (let i = 0; i < this.objects.length; i++) {
                const indexes = this.getIndex(this.objects[i]);
                for (const index of indexes) {
                    this.nodes[index].insert(this.objects[i]);
                }
            }
            
            this.objects = [];
        }
    }

    retrieve(rect) {
        const indexes = this.getIndex(rect);
        let returnObjects = this.objects;

        if (this.nodes.length) {
            for (const index of indexes) {
                returnObjects = returnObjects.concat(this.nodes[index].retrieve(rect));
            }
        }

        return returnObjects;
    }
}

// Exporta as classes
window.Physics = Physics;
window.QuadTree = QuadTree;
