// js/game.js

// 1. Matter.js 모듈 별칭 (Body 추가됨)
const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite,
      Events = Matter.Events,
      Body = Matter.Body; // ★ [수정] 이게 있어야 타원 모양 변경이 가능합니다.

// 전역 변수 (게임 제어용)
let engine = null;
let render = null;
let runner = null;
let currentScore = 0;
let nextItemIndex = 0;
let canDrop = true;

const TOP_LINE_Y = 50; 
let currentBody = null;

// 게임 설정 (이미지 경로 및 물리 크기)
export const RECYCLABLES = [
    { label: "trash",     radius: 15, score: 10,  scale: 0.25, texture: 'img/icon_trash.png' },
    { label: "paper",     radius: 20, score: 20,  scale: 0.30, texture: 'img/icon_paper.png', ovalScale: { x: 1.1, y: 0.9 } },   
    { label: "can",       radius: 25, score: 30,  scale: 0.35, texture: 'img/icon_can.png', ovalScale: { x: 0.8, y: 1.2 } },        
    { label: "glass",     radius: 30, score: 40,  scale: 0.40, texture: 'img/icon_glass.png', ovalScale: { x: 0.8, y: 1.2 } },      
    { label: "pet",       radius: 35, score: 50,  scale: 0.45, texture: 'img/icon_pet.png', ovalScale: { x: 0.7, y: 1.3 } },        
    { label: "vinyl",     radius: 40, score: 60,  scale: 0.50, texture: 'img/icon_vinyl.png', ovalScale: { x: 1.1, y: 0.9 } },      
    { label: "styrofoam", radius: 45, score: 70,  scale: 0.55, texture: 'img/icon_styrofoam.png' },  // 6
    { label: "food",      radius: 50, score: 100, scale: 0.60, texture: 'img/icon_food.png' }       // 7
];

/**
 * 게임 시작 함수
 */
export function startGame(container, scoreElement, nextItemElement, onGameOver) {
    // 1. 초기화
    currentScore = 0;
    canDrop = true;
    currentBody = null; // 게임 시작 시 초기화
    updateScore(0, scoreElement);
    setNextItem(nextItemElement);

    const width = container.clientWidth;
    const height = container.clientHeight;
    const wallThick = 50;

    // 2. 엔진 생성
    engine = Engine.create();
    const world = engine.world;

    // 3. 렌더러 생성
    render = Render.create({
        element: container,
        engine: engine,
        options: {
            width: width,
            height: height,
            wireframes: false,
            background: 'transparent'
        }
    });

    // 4. 벽 생성 (투명)
    const wallOptions = { isStatic: true, render: { opacity: 0 } };
    const ground = Bodies.rectangle(width / 2, height + wallThick/2 - 10, width, wallThick, wallOptions);
    const leftWall = Bodies.rectangle(0 - wallThick/2, height / 2, wallThick, height * 2, wallOptions);
    const rightWall = Bodies.rectangle(width + wallThick/2, height / 2, wallThick, height * 2, wallOptions);

    Composite.add(world, [ground, leftWall, rightWall]);

    // 5. 실행
    Render.run(render);
    runner = Runner.create();
    Runner.run(runner, engine);


    // 화면에 빨간 점선 그리기
    Events.on(render, 'afterRender', function() {
        if(!render || !render.context) return;
        
        const ctx = render.context;
        ctx.beginPath();
        ctx.moveTo(0, TOP_LINE_Y);
        ctx.lineTo(width, TOP_LINE_Y);
        ctx.setLineDash([10, 10]); 
        ctx.strokeStyle = '#ff4444'; 
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]); 
    });

    // 게임 종료 조건 검사
    Events.on(engine, 'beforeUpdate', function() {
        if (!render) return; // 방어 코드

        const bodies = Composite.allBodies(engine.world);

        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];

            if (body.isStatic) continue;
            if (body === currentBody) continue; // 방금 떨군 건 패스

            // 선 넘었는지 확인
            if (body.position.y < TOP_LINE_Y) {
                stopGame();

                if(onGameOver){
                    onGameOver(currentScore);
                }
                break;
            }
        }
    });

    // 6. 이벤트 리스너 등록
    render.canvas.addEventListener('pointerdown', (e) => handleInput(e, width, nextItemElement));

    // 7. 충돌 이벤트
    Events.on(engine, 'collisionStart', (event) => {
        const pairs = event.pairs;
        pairs.forEach((pair) => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;

            if (bodyA.label === bodyB.label) {
                const index = parseInt(bodyA.label);
                if (!isNaN(index) && index < RECYCLABLES.length - 1) {
                    Composite.remove(world, [bodyA, bodyB]);
                    
                    const newX = (bodyA.position.x + bodyB.position.x) / 2;
                    const newY = (bodyA.position.y + bodyB.position.y) / 2;
                    
                    // 합쳐진 물체 생성 (반환값은 필요 없음)
                    createNewItem(newX, newY, index + 1);
                    
                    currentScore += RECYCLABLES[index].score;
                    updateScore(currentScore, scoreElement);
                }
            }
        });
    });
}

/**
 * 게임 종료 및 메모리 정리 함수
 */
export function stopGame() {
    if (render) {
        Render.stop(render);
        if (render.canvas) render.canvas.remove();
        render.canvas = null;
        render.context = null;
        render.textures = {};
    }
    if (runner) Runner.stop(runner);
    if (engine) {
        Matter.World.clear(engine.world);
        Matter.Engine.clear(engine);
    }
    engine = null;
    runner = null;
    render = null;
}

// --- 내부 로직 함수들 ---

function handleInput(event, width, nextImgEl) {
    if (!canDrop) return;
    
    const rect = render.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    
    const clampX = Math.max(30, Math.min(width - 30, x));

    // ★ [수정] 반환된 body를 currentBody에 저장해야 안 죽습니다.
    currentBody = createNewItem(clampX, 50, nextItemIndex);

    canDrop = false;
    setNextItem(nextImgEl); 

    setTimeout(() => {
        canDrop = true;
        currentBody = null;
    }, 600); 
}

function createNewItem(x, y, index) {
    const item = RECYCLABLES[index];
    const body = Bodies.circle(x, y, item.radius, {
        label: index.toString(),
        restitution: 0.3,
        friction: 0.1, // 마찰력 추가
        render: {
            sprite: {
                texture: item.texture,
                xScale: item.scale,
                yScale: item.scale
            }
        }
    });

    // ★ [수정] body.scale -> Body.scale로 수정 (Body 모듈 필요)
    if(item.ovalScale){
        Body.scale(body, item.ovalScale.x, item.ovalScale.y);
    }
    
    Composite.add(engine.world, body);

    return body; // ★ [수정] body를 반환해야 handleInput에서 받습니다.
}

function setNextItem(imgElement) {
    nextItemIndex = Math.floor(Math.random() * 3);
    if (imgElement) {
        imgElement.src = RECYCLABLES[nextItemIndex].texture;
    }
}

function updateScore(score, scoreEl) {
    if (scoreEl) {
        scoreEl.innerText = score.toLocaleString();
        
        // 하이스코어 넘으면 강조
        const highScore = getHighScore();
        if (score > highScore) {
            scoreEl.style.color = '#ff4444'; // 빨간색으로 강조
        } else {
            scoreEl.style.color = '#333'; // 기본 색상
        }
    }
}

// localStorage에서 하이스코어 가져오기
function getHighScore() {
    const saved = localStorage.getItem('recyclingGameHighScore');
    return saved ? parseInt(saved) : 0;
}
