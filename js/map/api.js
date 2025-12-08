/**
 * api.js - 백엔드 API 통신 (클린하우스 데이터)
 * 개발자 B 작업 공간 (당신의 영역)
 */

// CSV 경로 및 캐시 설정
const CSV_URL = 'data/jeju_cleanhouse.csv';
let cachedResults = null;
let cachedTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5분

// 모든 클린하우스 동일한 운영 시간
const DEFAULT_OPERATING_HOURS = '15:00 - 04:00';

/**
 * 주변 클린하우스 정보 가져오기 (카카오맵 장소 검색 사용)
 * @param {number} lat - 위도
 * @param {number} lng - 경도
 * @param {number} radius - 반경 (미터, 기본 5000m)
 * @returns {Promise<Array>} 클린하우스 목록
 */
export async function getNearbyCleanHouses(lat, lng, radius = 5000) {
    // 캐시가 유효하면 캐시 사용
    const now = Date.now();
    if (cachedResults && (now - cachedTimestamp) < CACHE_TTL) {
        console.log('🗂️ 캐시된 클린하우스 결과 사용');
        return takeNearest(cachedResults, lat, lng, radius);
    }

    try {
        const csvData = await loadCsvCleanHouses();
        cachedResults = csvData;
        cachedTimestamp = Date.now();
        return takeNearest(csvData, lat, lng, radius);
    } catch (error) {
        console.error('❌ 클린하우스 데이터 로드 실패:', error.message);
        return [];
    }
}

/**
 * CSV 클린하우스 데이터 로드
 */
async function loadCsvCleanHouses() {
    const res = await fetch(CSV_URL);
    if (!res.ok) {
        throw new Error(`CSV fetch failed: ${res.status}`);
    }
    const text = await res.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
        throw new Error('CSV has no data');
    }

    // 헤더: 읍면동 명,도로명 주소,단지 명,위도 좌표,경도 좌표,...
    const idxAddr = 1; // 도로명 주소
    const idxName = 2; // 단지 명
    const idxLat = 3;  // 위도 좌표
    const idxLng = 4;  // 경도 좌표

    const items = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length <= idxLng) continue;
        const lat = parseFloat(cols[idxLat]);
        const lng = parseFloat(cols[idxLng]);
        if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
        const name = (cols[idxName] || '').trim() || '클린하우스';
        const address = (cols[idxAddr] || '').trim();
        items.push({
            id: `csv-${i}`,
            name,
            address,
            lat,
            lng,
            operatingHours: DEFAULT_OPERATING_HOURS
        });
    }
    console.log(`📥 CSV 로드 완료: ${items.length}개`);
    return items;
}

/**
 * 가까운 순으로 정렬 후 최대 5개 반환
 */
function takeNearest(data, lat, lng, radius) {
    return data
        .map((item) => {
            const distance = calculateDistance(lat, lng, item.lat, item.lng);
            return { ...item, distance: Math.round(distance) };
        })
        .filter((item) => item.distance <= radius)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);
}

/**
 * 두 좌표 간 거리 계산 (미터)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // 지구 반지름 (미터)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}


/**
 * 히스토리 저장 (로컬스토리지)
 * @param {Object} record - 저장할 기록
 */
export function saveHistory(record) {
    try {
        const history = JSON.parse(localStorage.getItem('recycling-history') || '[]');
        
        // 새 기록 추가
        history.unshift({
            ...record,
            id: Date.now(),
            timestamp: new Date().toISOString()
        });

        // 최대 50개만 저장
        if (history.length > 50) {
            history.pop();
        }

        localStorage.setItem('recycling-history', JSON.stringify(history));
        console.log('✅ 히스토리 저장 완료');
        
        return true;

    } catch (error) {
        console.error('❌ 히스토리 저장 실패:', error);
        return false;
    }
}

/**
 * 히스토리 목록 가져오기 (로컬스토리지)
 */
export function getHistory() {
    try {
        const history = JSON.parse(localStorage.getItem('recycling-history') || '[]');
        console.log(`📜 히스토리 ${history.length}개 로드됨`);
        return history;

    } catch (error) {
        console.error('❌ 히스토리 로드 실패:', error);
        return [];
    }
}

/**
 * API 제한 에러 사용자에게 표시
 */
function showApiLimitError() {
    // 이미 표시된 에러가 있으면 중복 표시 안 함
    if (document.getElementById('api-limit-error')) {
        return;
    }

    const errorDiv = document.createElement('div');
    errorDiv.id = 'api-limit-error';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ff4444;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 90%;
        text-align: center;
        font-size: 14px;
    `;
    errorDiv.innerHTML = `
        <div style="margin-bottom: 8px; font-weight: bold;">
            ⚠️ 카카오맵 API 요청 제한 초과
        </div>
        <div style="margin-bottom: 12px;">
            잠시 후 페이지를 새로고침해주세요.
        </div>
        <button onclick="location.reload()" style="
            background: white;
            color: #ff4444;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        ">지금 새로고침</button>
        <button onclick="this.parentElement.remove()" style="
            background: transparent;
            color: white;
            border: 1px solid white;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-left: 8px;
        ">닫기</button>
    `;
    
    document.body.appendChild(errorDiv);
    
    // 10초 후 자동 제거
    setTimeout(() => {
        if (errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, 10000);
}
