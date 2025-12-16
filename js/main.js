// js/main.js

import { initMap } from './map/map.js';
import { startGame, stopGame, RECYCLABLES } from './game.js';
import { analyzeImage, testConnection } from './ai/api.js';  // ← AI API 추가

// 전역 변수
let uploadCard = null;
let fileInput = null;
let currentImageSrc = null;
let currentImageFile = null;  // ← 업로드된 파일 저장용

// --- 1. 초기 상태 ---
function renderInitialState() {
    stopGame(); 
    if (!uploadCard) return;
    uploadCard.innerHTML = `
        <div class="upload-header">
            <div class="avatar-icon"><img src="img/earth.png" class="earth" onerror="this.outerHTML='🌏'"></div>
            <div class="text-group">
                <h3>분리수거할 쓰레기 사진을 업로드 해주세요</h3>
                <p>분리수거 시 세척은 필수입니다!</p>
            </div>
        </div>

        <div class="illustration-area" style="height: 250px; display: flex; justify-content: center; align-items: center; border-radius: 20px;">
            <div class="illustration-items">
                <img src="img/group.png" style="width: 250px;" alt="Illustration">
            </div>
        </div>

        <div class="btn-group" style="margin-top: 20px;">
            <button class="white-btn" onclick="renderGameState()">미니 게임</button>
            <button class="white-btn" onclick="triggerFileUpload()">사진/파일 업로드</button>
        </div>
    `;
}

// --- 2. 게임 상태 (두 번째 코드 기준: 높이 400px) ---
function renderGameState() {
    if (!uploadCard) return;

    // 진화 아이콘 리스트
    let evolutionHTML = '';
    RECYCLABLES.forEach((item, index) => {
        evolutionHTML += `<img src="${item.texture}" style="width: 28px; height: 28px; object-fit: contain;">`;
        if (index < RECYCLABLES.length - 1) {
            evolutionHTML += `<span style="color: #ddd; font-size: 10px; margin: 0 4px;">▶</span>`;
        }
    });

    uploadCard.innerHTML = `
        <div class="game-header-bar" style="display: flex; justify-content: space-between; align-items: stretch; margin-bottom: 15px; gap: 10px; height: 50px;">
            <div class="score-box" style="flex: 1; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 5px;">
                <div style="display: flex; align-items: center; gap: 5px;">
                    <span class="score", style="font-size: 10px; ">SCORE</span>
                    <span class="game-score", id="game-score" style="font-size: 20px; font-weight: 800; line-height: 1;">0</span>
                </div>
                <div style="display: flex; align-items: center; gap: 5px; margin-top: 2px;">
                    <span style="font-size: 9px; ">BEST</span>
                    <span id="game-best-score" style="font-size: 14px; font-weight: 700; color: #ffd700; line-height: 1;">${getHighScore().toLocaleString()}</span>
                </div>
            </div>
            
            <div class="next-box" style="flex: 1; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); display: flex; flex-direction: row; justify-content: center; align-items: center; gap: 8px;">
                <span style="font-size: 11px;">NEXT</span>
                <img id="next-item-img" src="" style="width: 32px; height: 32px; object-fit: contain;">
            </div>
        </div>

        <div class="evolution-bar">
            ${evolutionHTML}
        </div>

        <div id="game-wrapper" style="width: 100%; height: 400px; background: #f0f2f5; border-radius: 16px; overflow: hidden; position: relative; touch-action: none;">
            <div id="game-over-modal" style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: white; justify-content: center; align-items: center; flex-direction: column; z-index: 20; border-radius: 16px;">
                <div class="game-over-page", style="background: white; padding: 20px 25px; border-radius: 16px; text-align: center; width: 96%; height: 96%; margin: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.15); display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <h2 style="margin: 0 0 5px 0; color: #ff4444; font-size: 24px;">GAME OVER</h2>
                    <p id="new-record-text" style="display: none; margin: 0 0 5px 0; font-size: 13px; color: #ffd700; font-weight: 800; animation: blink 1s infinite;">🎉 신기록 달성! 🎉</p>
                    <p style="margin: 5px 0 3px 0; font-size: 12px; color: #888;">최종 점수</p>
                    <h1 id="final-score-text" style="margin: 0 0 8px 0; font-size: 36px; color: #333;">0</h1>
                    <div style="padding: 8px; border-radius: 10px; margin-bottom: 15px; width: 70%; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                        <p style="margin: 0; font-size: 11px; color: #aaa;">최고 기록</p>
                        <p id="high-score-text" style="margin: 3px 0 0 0; font-size: 20px; font-weight: 700; color: #ffd700;">0</p>
                    </div>
                    
                </div>
            </div>
        </div>

        <div class="btn-group" style="margin-top:15px;">
            <button class="white-btn" onclick="renderInitialState()">뒤로 가기</button>
            <button class="white-btn" onclick="restartGame()">다시 하기</button>
        </div>
    `;

    startNewGameLogic();
}

function startNewGameLogic() {
    const modal = document.getElementById('game-over-modal');
    if (modal) modal.style.display = 'none';

    setTimeout(() => {
        const container = document.getElementById('game-wrapper');
        const scoreEl = document.getElementById('game-score');
        const nextEl = document.getElementById('next-item-img');
        
        if (container) {
            startGame(container, scoreEl, nextEl, (finalScore) => {
                showGameOverModal(finalScore);
            });
        }
    }, 100);
}

function showGameOverModal(score) {
    const modal = document.getElementById('game-over-modal');
    const scoreText = document.getElementById('final-score-text');
    const highScoreText = document.getElementById('high-score-text');
    const newRecordText = document.getElementById('new-record-text');
    
    if (modal && scoreText) {
        scoreText.innerText = score.toLocaleString();
        
        // 하이스코어 처리
        const highScore = getHighScore();
        const isNewRecord = score > highScore;
        
        if (isNewRecord) {
            setHighScore(score);
            if (newRecordText) {
                newRecordText.style.display = 'block';
            }
        } else {
            if (newRecordText) {
                newRecordText.style.display = 'none';
            }
        }
        
        if (highScoreText) {
            highScoreText.innerText = getHighScore().toLocaleString();
        }
        
        modal.style.display = 'flex';
    }
}

// === localStorage 하이스코어 함수 ===
function getHighScore() {
    const saved = localStorage.getItem('recyclingGameHighScore');
    return saved ? parseInt(saved) : 0;
}

function setHighScore(score) {
    localStorage.setItem('recyclingGameHighScore', score.toString());
}

function restartGame() {
    // 현재 점수를 먼저 저장
    const scoreEl = document.getElementById('game-score');
    if (scoreEl) {
        const currentScore = parseInt(scoreEl.innerText.replace(/,/g, '')) || 0;
        const highScore = getHighScore();
        
        console.log('📊 다시하기 클릭 - 현재:', currentScore, '/ 최고:', highScore);
        
        // 하이스코어 갱신
        if (currentScore > highScore) {
            setHighScore(currentScore);
            console.log('🎉 하이스코어 갱신!', currentScore);
        }
        
        // BEST 점수 화면 업데이트
        const bestScoreEl = document.getElementById('game-best-score');
        if (bestScoreEl) {
            const newBest = getHighScore().toLocaleString();
            bestScoreEl.innerText = newBest;
            console.log('✅ BEST 화면 업데이트:', newBest);
        } else {
            console.warn('⚠️ game-best-score 요소를 찾을 수 없음');
        }
    } else {
        console.warn('⚠️ game-score 요소를 찾을 수 없음');
    }
    
    stopGame();
    startNewGameLogic();
}

// --- 3. 미리보기 상태 ---
function renderPreviewState(imgSrc) {
    if (!uploadCard) return;
    uploadCard.innerHTML = `
        <div class="upload-header">
            <div class="avatar-icon"><img src="img/earth.png" class="earth" onerror="this.outerHTML='🌏'"></div>
            <div class="text-group">
                <h3>분리수거할 쓰레기 사진을 업로드 해주세요</h3>
                <p>분리수거 시 세척은 필수입니다!</p>
            </div>
        </div>
        <div class="illustration-area" style="padding: 10px; height: 250px; display: flex; justify-content: center; align-items: center; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
            <img src="${imgSrc}" alt="Uploaded Preview" style="max-height: 100%; width: auto; border-radius: 8px;">
        </div>
        <div class="btn-group" style="margin-top: 20px;">
            <button class="white-btn" onclick="renderInitialState()">다시 업로드</button>
            <button class="white-btn" onclick="startAnalysis()">분리수거 시작</button>
        </div>
    `;
}

// --- 4. 로딩 상태 ---
function renderLoadingState() {
    if (!uploadCard) return;
    if (!window.THREE) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = initThreeJS;
        document.head.appendChild(script);
    } else {
        setTimeout(initThreeJS, 100);
    }

    const messages = [
        "당신의 손길 하나가 제주를 다시 빛나게 합니다.",
        "작은 배려가 바다를 오래도록 맑게 합니다.",
        "오늘의 분리배출이 누군가의 내일을 지켜줍니다.",
        "당신의 실천이 파도처럼 제주에 번져갑니다.",
        "쓰레기를 버린 순간, 자연은 다시 숨을 쉽니다.",
        "한 번의 선택이 제주를 더 푸르게 물들입니다.",
        "당신의 작은 움직임이 큰 변화를 만듭니다.",
        "지켜낸 자연은 언젠가 우리에게 돌아옵니다.",
        "조용한 실천이 가장 큰 힘이 됩니다.",
        "당신 덕분에 오늘의 제주가 더 따뜻해졌습니다."
    ];

    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    
    uploadCard.innerHTML = `
        <div class="upload-header">
            <div class="avatar-icon"><img src="img/earth.png" class="earth" onerror="this.outerHTML='🌏'" style="margin-top:15px;"></div>
            <div class="text-group" style="min-width: 0; margin-top: 8px;">
                <h3 style="word-break: keep-all; line-height: 1.4; ">${randomMsg}</h3>
                <p>조금만 기다려주세요...</p>
            </div>
        </div>

        <div class="loading-container" style="display: flex; flex-direction: row !important; flex-wrap: nowrap; align-items: center; justify-content: center; height: 380px; padding: 30px 10px; gap: 15px;">
            <div id="canvas-container" style="flex: 0 0 130px; width: 130px; height: 130px; border-radius: 20px;"></div>
            <div class="speech-bubble" style="flex: 1; min-width: 0; position: relative; padding: 20px 15px; border-radius: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.05);">
                <h4 id="loadingText" style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700;"></h4>
                <div style="width: 100%; height: 12px; background: #e9ecef; border-radius: 6px; overflow: hidden;">
                    <div id="progressBar" style="width: 0%; height: 100%; background: #74c98a; border-radius: 6px; transition: width 0.1s linear;"></div>
                </div>
            </div>
        </div>
    `;

    function initThreeJS() {
        const container = document.getElementById('canvas-container');
        if (!container) return;
        container.innerHTML = '';

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
        camera.position.z = 2.5; 

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(130, 130);
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        renderer.domElement.style.display = "block";
        renderer.domElement.style.outline = "none"; 

        container.appendChild(renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 3, 5);
        scene.add(directionalLight);

        const geometry = new THREE.SphereGeometry(1, 64, 64);
        const textureLoader = new THREE.TextureLoader();

        textureLoader.load('./img/earth_final.png', function(texture) {
            texture.encoding = THREE.sRGBEncoding;
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(1.5, 1.5); 
            texture.offset.set(-0.3, -0.3);

            const material = new THREE.MeshPhongMaterial({ 
                map: texture, 
                shininess: 10,
            });
            const sphere = new THREE.Mesh(geometry, material);
            sphere.rotation.y = 4.7; 
            sphere.rotation.x = 0.2; 
            scene.add(sphere);

            function animate() {
                if(document.getElementById('canvas-container')) {
                    requestAnimationFrame(animate);
                    sphere.rotation.y -= 0.04; 
                    renderer.render(scene, camera);
                }
            }
            animate();
        });
    }

    const bar = document.getElementById('progressBar');
    const textElem = document.getElementById('loadingText');
    const fullText = "쓰레기 분류 중입니다..."; 
    let currentIndex = 0;
    const interval = setInterval(() => {
        if (currentIndex >= fullText.length) { clearInterval(interval); } 
        else {
            currentIndex++;
            textElem.innerText = fullText.substring(0, currentIndex);
            if(bar) bar.style.width = (currentIndex / fullText.length) * 100 + '%';
        }
    }, 2500 / fullText.length);
}

// --- 5. 결과 상태 ---
function renderResultState(resultData) {
    if (!uploadCard) return;
    const typeName = resultData.type.split('(')[0].trim();
    let iconPath = 'img/icon_trash.png'; 
    if (typeName.includes('플라스틱')) iconPath = 'img/icon_pet.png';
    else if (typeName.includes('캔')) iconPath = 'img/icon_can.png';
    else if (typeName.includes('종이')) iconPath = 'img/icon_paper.png';
    else if (typeName.includes('병')) iconPath = 'img/icon_glass.png';
    else if (typeName.includes('일반 쓰레기')) iconPath = 'img/icon_trash.png';
    else if (typeName.includes('음식물')) iconPath = 'img/icon_food.png';
    else if (typeName.includes('비닐')) iconPath = 'img/icon_vinyl.png';
    else if (typeName.includes('스티로폼')) iconPath = 'img/icon_styrofoam.png';
    
    const typeColor = {
        '플라스틱': '#00AAFF', '캔/고철류': '#E93232', '병류': '#E56B28', 
        '종이류': '#9A8620', '일반쓰레기': '#575757', '음식물': '#5050ED',
        '비닐류': '#4EBF00', '스티로폼': '#AF24B1'
    };
    const titleColor = typeColor[typeName] || '#4dabf7';
    
    uploadCard.innerHTML = `
        <div class="upload-header">
            <div class="avatar-icon"><img src="img/earth.png" class="earth" onerror="this.outerHTML='🌏'"></div>
            <div class="text-group">
                <h3>이 쓰레기의 정체는?</h3>
                <p>어떻게 버려야 할지 알려드릴게요!</p>
            </div>
        </div>
        <div class="illustration-area" style="height: 250px; display: flex; flex-direction: row; align-items: center; border-radius: 20px;">
            <div style="width: 175px; height: 175px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
                <img src="${iconPath}" style="width: 100%; height: 100%; object-fit: contain;">
            </div>
            <div style="flex-grow: 1; min-width: 0; text-align: center;">
                <p style="font-size: 16px; color: #868e96; font-weight: 500;">이 쓰레기는</p>
                <h2 style="font-size: 32px; font-weight: 900; color: ${titleColor};">${typeName}</h2>
                <p style="font-size: 16px; color: #868e96; margin-bottom: 15px; font-weight: 500;">입니다</p>
                <div style="border-radius: 12px; font-size: 15px; line-height: 1.5; word-break: keep-all; text-align: center;">
                    <span style="color: #fa5252; font-weight: 800;">❗ 잠깐</span><br>
                    ${resultData.tip}
                </div>
            </div>
        </div>
        <div class="btn-group" style="margin-top: 20px;">
            <button class="white-btn" onclick="renderInitialState()">다른 사진 분석하기</button>
            <button class="white-btn" onclick="startAnalysis()">다시 분석하기</button>
        </div>
    `;
}

// --- 공통 기능 ---
function triggerFileUpload() { if (fileInput) fileInput.click(); }
function handleFileSelect(e) { 
    const file = e.target.files[0];

    if (!file) return;

    // --- [추가] 1. 파일 크기 검사 (10MB) ---
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
        alert(`❌ 파일 크기가 너무 큽니다! (10MB 이하만 가능)\n현재 크기: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        e.target.value = ''; // 입력 초기화 (선택 취소)
        return;
    }

    // --- [추가] 2. 파일 형식 검사 (MIME Type) ---
    // 백엔드 기준: ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    // (브라우저는 보통 .jpg도 'image/jpeg'로 인식하지만, 안전하게 목록에 다 넣었습니다)
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    
    if (!ALLOWED_TYPES.includes(file.type)) {
        alert('❌ 지원하지 않는 파일 형식입니다.\n(JPG, PNG, WEBP 형식만 업로드 가능합니다)');
        e.target.value = ''; // 입력 초기화
        return;
    }

    // --- 3. 유효성 검사 통과 시 처리 ---
    currentImageFile = file; // 파일 저장 (API 전송용)
    const reader = new FileReader();
    reader.onload = function(e) {
        currentImageSrc = e.target.result;
        renderPreviewState(currentImageSrc); // 미리보기 화면으로 이동
    }
    reader.readAsDataURL(file);

    // 입력값 초기화 (같은 파일을 다시 선택해도 이벤트가 발생하도록)
    e.target.value = ''; 
}

async function startAnalysis() { 
    // 1. 업로드된 파일이 없으면 리턴
    if (!currentImageFile) {
        alert('먼저 이미지를 업로드해주세요!');
        return;
    }

    // 2. 로딩 화면 시작 (프로그래스바 애니메이션이 약 2.5초 동안 실행됨)
    renderLoadingState();
    
    try {
        
        const minLoadingTime = new Promise(resolve => setTimeout(resolve, 2500));
        
        // 실제 데이터 요청 (실패 시 mock 데이터 사용하도록 예외처리 포함)
        const analysisRequest = analyzeImage(currentImageFile)
            .catch(error => {
                console.error('❌ 분석 중 오류(서버):', error);
                return mockAiAnalysis(currentImageSrc);
            });

        // Promise.all: "시간도 2.5초 지났고, 분석도 끝났을 때" 결과를 반환함
        const [_, result] = await Promise.all([minLoadingTime, analysisRequest]);

        // 3. 결과 화면 보여주기
        // (화면 전환 직전, 혹시 모르니 프로그래스바를 100%로 강제 채움)
        const bar = document.getElementById('progressBar');
        if (bar) bar.style.width = '100%';

        // 아주 잠깐(0.1초) 100% 상태를 보여준 뒤 결과 화면 출력 (자연스러움)
        setTimeout(() => {
            renderResultState(result);
        }, 100);

    } catch (error) {
        console.error('❌ 알 수 없는 오류:', error);
        // 최악의 경우에도 가짜 데이터로 결과 보여줌
        const mockResult = await mockAiAnalysis(currentImageSrc);
        renderResultState(mockResult);
    }
}

function mockAiAnalysis(imageData) { 
    return new Promise((resolve) => {
        setTimeout(() => {
            const results = [
                { type: "플라스틱", tip: "내용물을 비우고 라벨을 제거한 후 압축해서 버려주세요." },
                { type: "캔/고철류", tip: "내용물을 비우고 헹군 뒤 찌그러뜨려 배출해주세요." },
                { type: "비닐류", tip: "이물질을 씻어내고 흩날리지 않게 한곳에 모아 배출해주세요." },
                { type: "음식물", tip: "물기를 꽉 짜고 뼈나 껍데기 등 딱딱한 것은 제외하고 배출해주세요." },
                { type: "스티로폼", tip: "테이프와 운송장을 제거하고 흰색의 깨끗한 것만 모아 배출해주세요." },
                { type: "종이류", tip: "테이프 등 이물질을 제거하고 펴서 배출해주세요." },
                { type: "병류", tip: "내용물은 비우고 뚜껑을 분리해 배출해주세요." },
                { type: "일반쓰레기", tip: "재활용품과 음식물을 제외하고 종량제 봉투에 담아 묶어서 배출해주세요." }
            ];
            resolve(results[Math.floor(Math.random() * results.length)]);
        }, 3000); 
    });
}

// 전역 함수 노출
window.triggerFileUpload = triggerFileUpload;
window.renderInitialState = renderInitialState;
window.renderGameState = renderGameState;
window.startAnalysis = startAnalysis;
window.restartGame = restartGame;

// 초기화
document.addEventListener('DOMContentLoaded', async () => {

    uploadCard = document.getElementById('uploadCard');
    fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.addEventListener('change', handleFileSelect);
    if (uploadCard) renderInitialState();
    
    console.log("🗺️ Map 모듈 초기화...");
    initMap();

    // 백엔드 서버 연결 테스트
    console.log("🔌 백엔드 서버 연결 테스트 중...");
    const isConnected = await testConnection();
    if (isConnected) {
        console.log("✅ 백엔드 서버와 연결되었습니다!");
    } else {
        console.warn("⚠️ 백엔드 서버에 연결할 수 없습니다. Mock 데이터를 사용합니다.");
    }
});