// 전역 변수 미리 선언
let uploadCard = null;
let fileInput = null;
let currentImageSrc = null;

// --- 1. 초기 상태 ---
function renderInitialState() {
    if (!uploadCard) return;
    uploadCard.innerHTML = `
        <div class="upload-header">
            <!-- 이미지 경로가 맞는지 확인해주세요 (img/earth.png) -->
            <div class="avatar-icon"><img src="img/earth.png" class="earth" onerror="this.outerHTML='🌏'"></div>
            <div class="text-group">
                <h3>분리수거할 쓰레기 사진을 업로드 해주세요</h3>
                <p>분리수거 시 세척은 필수입니다!</p>
            </div>
        </div>

        <div class="illustration-area" style="height: 250px; display: flex; justify-content: center; align-items: center; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
            <div class="illustration-items">
                <!-- 이미지 경로가 맞는지 확인해주세요 (img/group.png) -->
                <img src="img/group.png" style="width: 250px; width: 250px;" alt="Illustration">
            </div>
        </div>

        <div class="btn-group">
            <button class="btn btn-outline">히스토리</button>
            <button class="btn btn-primary" onclick="triggerFileUpload()">사진/파일 업로드</button>
        </div>
    `;
}

// --- 2. 미리보기 상태 ---
function renderPreviewState(imgSrc) {
    if (!uploadCard) return;
    uploadCard.innerHTML = `
        <div class="upload-header">
            <!-- 이미지 경로가 맞는지 확인해주세요 (img/earth.png) -->
            <div class="avatar-icon"><img src="img/earth.png" class="earth" onerror="this.outerHTML='🌏'"></div>
            <div class="text-group">
                <h3>분리수거할 쓰레기 사진을 업로드 해주세요</h3>
                <p>분리수거 시 세척은 필수입니다!</p>
            </div>
        </div>

        <div class="illustration-area" style="padding: 10px; height: 250px; display: flex; justify-content: center; align-items: center; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
            <img src="${imgSrc}" alt="Uploaded Preview" style="max-height: 100%; width: auto; border-radius: 8px;">
        </div>

        <div class="btn-group">
            <button class="btn btn-outline" onclick="renderInitialState()">다시 업로드</button>
            <button class="btn btn-primary" onclick="startAnalysis()">분리수거 시작</button>
        </div>
    `;
    uploadCard.innerCSS = `.illustration-area { width: auto; height: 250px;  }`;
}

// --- 3. 로딩 상태 (CSS 충돌 방지 & 꽉 채우기 버전) ---
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

    uploadCard.innerHTML = `
        <div class="upload-header">
            <div class="avatar-icon"><img src="img/earth.png" class="earth" onerror="this.outerHTML='🌏'"></div>
            <div class="text-group" style="min-width: 0; margin-top: 8px;">
                <h3>덕분에 오늘 제주 바다가 깨끗해졌어요!</h3>
            </div>
        </div>
        <div class="loading-container" style="display: flex; flex-direction: row !important; flex-wrap: nowrap; align-items: center; justify-content: center; height: 330px; padding: 30px 10px; gap: 15px;">
            <div id="canvas-container" style="flex: 0 0 130px; width: 130px; height: 130px; border-radius: 20px; clip-path: inset(0px round 20px); -webkit-clip-path: inset(0px round 20px);"></div>

            <div class="speech-bubble" style="flex: 1; min-width: 0; position: relative; background: white; padding: 20px 15px; border-radius: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); border: 1px solid #f1f3f5;">
                <div style="position: absolute; top: 50%; left: -10px; transform: translateY(-50%); width: 0; height: 0; border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-right: 12px solid white;"></div>
                <div style="position: absolute; top: 50%; left: -11px; transform: translateY(-50%); width: 0; height: 0; border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-right: 12px solid #f1f3f5; z-index: -1;"></div>
                <h4 id="loadingText" style="margin: 0 0 12px 0; font-size: 15px; color: #333; font-weight: 700; white-space: nowrap; min-height: 22px;"></h4>
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
        
        // 카메라 거리 (3.2가 황금비율)
        camera.position.z = 2.5; 

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        
        // 렌더러 크기 설정
        renderer.setSize(130, 130);
        renderer.outputEncoding = THREE.sRGBEncoding;

        // ★★★ 핵심 수정: 캔버스 스타일 강제 적용 ★★★
        // main.css의 영향을 무시하고 컨테이너에 꽉 차게 만듭니다.
        // display: block으로 설정하여 하단 미세 여백(ghost space)을 제거합니다.
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        renderer.domElement.style.display = "block"; // 이게 중요합니다!
        renderer.domElement.style.outline = "none";  // 혹시 모를 테두리 제거

        container.appendChild(renderer.domElement);

        // 조명 설정
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 3, 5);
        scene.add(directionalLight);

        const geometry = new THREE.SphereGeometry(1, 64, 64);
        const textureLoader = new THREE.TextureLoader();

        // 이미지 로드
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

// --- 4. 결과 상태 ---
function renderResultState(resultData) {
    if (!uploadCard) return;

    const typeName = resultData.type.split('(')[0].trim();

    // 2. ★★★ 핵심: 쓰레기 종류별 아이콘 이미지 선택 로직 ★★★
    let iconPath = 'img/icon_trash.png'; // 기본 아이콘 

    if (typeName.includes('플라스틱')) {
        iconPath = 'img/icon_pet.png';      // 플라스틱/페트병 아이콘
    } else if (typeName.includes('캔/고철류')) {
        iconPath = 'img/icon_can.png';      // 캔 아이콘
    } else if (typeName.includes('종이류')) {
        iconPath = 'img/icon_paper.png';    // 종이 박스 아이콘
    } else if (typeName.includes('병류')) {
        iconPath = 'img/icon_glass.png';    // 유리병 아이콘
    }else if (typeName.includes('일반쓰레기')) {
        iconPath = 'img/icon_trash.png';  // 일반 쓰레기 아이콘
    }else if (typeName.includes('음식물')) {
        iconPath = 'img/icon_food.png';  // 음식물 쓰레기 아이콘
    }else if (typeName.includes('비닐')) {
        iconPath = 'img/icon_vinyl.png';  // 비닐 쓰레기 아이콘
    }else if (typeName.includes('스티로폼')) {
        iconPath = 'img/icon_styrofoam.png';  // 스티로폼 아이콘
    }

    const typeColor = {
        '플라스틱': '#00AAFF', // 회색
        '캔/고철류': '#E93232',    // 주황색
        '병류': '#E56B28',    // 녹색
        '종이류': '#9A8620',   // 노란색
        '일반쓰레기': '#69727A',  // 파란색
        '음식물': '#57A144',// 빨간색
        '비닐류': '#9FC2C7',  // 파란색
        '스티로폼': '#C6C7C7' // 빨간색
    };

    const defaultColor = '#4dabf7';

    const titleColor = typeColor[typeName] || defaultColor;

    uploadCard.innerHTML = `
        <div class="upload-header">
            <!-- 이미지 경로가 맞는지 확인해주세요 (img/earth.png) -->
            <div class="avatar-icon"><img src="img/earth.png" class="earth" onerror="this.outerHTML='🌏'"></div>
            <div class="text-group">
                <h3>분리수거할 쓰레기 사진을 업로드 해주세요</h3>
                <p>분리수거 시 세척은 필수입니다!</p>
            </div>
        </div>

        <div class="illustration-area" style="
            height: 250px;
            display: flex; 
            flex-direction: row; 
            align-items: center; 
            border-radius: 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
            
            <div style="
                width: 175px; 
                height: 175px; 
                flex-shrink: 0; 
                display: flex;
                align-items: center;
                justify-content: center; 
                border-radius: 20px; 
                overflow: hidden;">
                
                <img src="${iconPath}" style="width: 100%; height: 100%; object-fit: contain;">
            </div>

            <div style="flex-grow: 1; min-width: 0; text-align: center;">
                
                <p style="font-size: 16px; color: #868e96; font-weight: 500;">
                    이 쓰레기는
                </p>
                
                <h2 style="font-size: 32px; font-weight: 900; color: ${titleColor}; letter-spacing: -0.5px;">
                    ${typeName}
                </h2>
                
                <p style="font-size: 16px; color: #868e96; margin-bottom: 15px; font-weight: 500;">
                    입니다
                </p>

                <div style="
                    border-radius: 12px; 
                    font-size: 15px; 
                    line-height: 1.5; 
                    word-break: keep-all; 
                    white-space: normal; 
                    text-align: center;">
                    <span style="color: #fa5252; font-weight: 800;">❗ 잠깐</span><br>
                    ${resultData.tip}
                </div>
            </div>
        </div>

        <div class="btn-group" style="margin-top: 20px;">
            <button class="btn btn-outline" onclick="renderInitialState()">다른 사진 분석하기</button>
            <button class="btn btn-primary" onclick="startAnalysis()">다시 분석하기</button>
        </div>
    `;
}


// --- 기능 함수들 ---

function triggerFileUpload() {
    if (fileInput) {
        fileInput.click();
    } else {
        console.error("fileInput 요소를 찾을 수 없습니다.");
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드할 수 있습니다.');
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            currentImageSrc = e.target.result;
            renderPreviewState(currentImageSrc);
        }
        reader.readAsDataURL(file);
    }
    e.target.value = ''; 
}

function startAnalysis() {
    renderLoadingState();
    mockAiAnalysis(currentImageSrc).then((result) => {
        renderResultState(result);
    });
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

// ★★★ 핵심: HTML 로딩 후 실행 ★★★
document.addEventListener('DOMContentLoaded', () => {
    // 1. HTML 태그 찾기
    uploadCard = document.getElementById('uploadCard');
    fileInput = document.getElementById('fileInput');

    // 2. 태그가 잘 찾아졌는지 확인하고 연결
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
        console.log("파일 업로드 기능 연결 성공!");
    } else {
        console.error("오류: HTML에 id='fileInput'이 없습니다. main.html 파일을 저장했는지 확인해주세요.");
    }

    if (uploadCard) {
        renderInitialState();
        console.log("화면 그리기 성공!");
    } else {
        console.error("오류: HTML에 id='uploadCard'가 없습니다.");
    }
});