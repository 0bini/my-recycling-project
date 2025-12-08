/**
 * map.js - 카카오맵 및 클린하우스 관리
 * 개발자 B 작업 공간 (당신의 영역)
 */

import { getNearbyCleanHouses } from './api.js';

let map = null;
let markers = [];
let currentPosition = { lat: 33.4996, lng: 126.5312 }; // 제주시 기본 좌표
let allCleanHouses = [];
let kakaoLoadRetryCount = 0; // 재시도 횟수

/**
 * 지도 초기화 함수
 * main.js에서 호출됨
 */
export function initMap() {
    console.log('🗺️ [Map] 지도 초기화 시작...');
    
    // 사용자 위치 가져오기
    getUserLocation();
}

/**
 * 사용자 현재 위치 가져오기
 * 건물 안에서도 더 정확한 위치를 얻기 위해 여러 번 시도
 */
function getUserLocation() {
    if (navigator.geolocation) {
        let positions = [];
        let attempts = 0;
        const maxAttempts = 3;
        
        const getPosition = () => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    positions.push({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                    
                    attempts++;
                    
                    console.log(`📍 위치 측정 ${attempts}/${maxAttempts}:`, {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: Math.round(position.coords.accuracy) + 'm'
                    });
                    
                    // 여러 번 측정해서 평균 내기 (건물 안에서 정확도 향상)
                    if (attempts < maxAttempts) {
                        setTimeout(getPosition, 1000); // 1초 후 다시 측정
                    } else {
                        // 가장 정확한 위치 선택 (accuracy가 낮을수록 정확함)
                        const bestPosition = positions.reduce((best, current) => 
                            current.accuracy < best.accuracy ? current : best
                        );
                        
                        currentPosition = {
                            lat: bestPosition.lat,
                            lng: bestPosition.lng
                        };
                        
                        console.log('✅ 최종 위치:', currentPosition);
                        console.log('📍 최종 정확도:', Math.round(bestPosition.accuracy) + 'm');
                        
                        if (bestPosition.accuracy > 100) {
                            console.warn('⚠️ 위치 정확도가 낮습니다. 건물 안에 있거나 GPS 신호가 약할 수 있습니다.');
                        }
                        
                        loadKakaoMap();
                    }
                },
                (error) => {
                    console.error('❌ 위치 가져오기 실패:', error.message);
                    console.warn('⚠️ 제주시 기본 좌표 사용');
                    loadKakaoMap();
                },
                {
                    enableHighAccuracy: true,  // GPS 사용
                    timeout: 15000,           // 15초 타임아웃 (건물 안에서 더 오래 기다림)
                    maximumAge: 0              // 캐시 사용 안 함
                }
            );
        };
        
        getPosition();
    } else {
        console.warn('⚠️ Geolocation 미지원 - 제주시 기본 좌표 사용');
        loadKakaoMap();
    }
}

/**
 * 카카오맵 로드
 */
function loadKakaoMap() {
    // Kakao API 로드 확인
    if (typeof kakao === 'undefined' || !kakao.maps) {
        kakaoLoadRetryCount++;
        
        if (kakaoLoadRetryCount > 5) {
            console.error('❌ Kakao Map API 로드 실패 (5회 재시도 초과)');
            console.error('💡 Kakao Developers에서 도메인 설정을 확인해주세요:');
            console.error('   플랫폼 > Web > 사이트 도메인: http://127.0.0.1:5500');
            showMapError();
            return;
        }
        
        console.warn(`⏳ Kakao Map API 로딩 대기 중... (${kakaoLoadRetryCount}/5)`);
        setTimeout(loadKakaoMap, 1000);
        return;
    }

    const mapContainer = document.getElementById('map-container');
    
    // 기존 아이콘 제거
    mapContainer.innerHTML = '';
    
    const mapOption = {
        center: new kakao.maps.LatLng(currentPosition.lat, currentPosition.lng),
        level: 5 // 확대 레벨
    };

    // 지도 생성
    map = new kakao.maps.Map(mapContainer, mapOption);

    // 현재 위치 마커 추가 (빨간색 점으로 표시)
    const currentMarkerImage = new kakao.maps.MarkerImage(
        'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png',
        new kakao.maps.Size(24, 35)
    );
    
    const currentMarker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(currentPosition.lat, currentPosition.lng),
        map: map,
        image: currentMarkerImage,
        title: '현재 위치'
    });

    console.log('✅ 카카오맵 로드 완료');

    // 클린하우스 데이터 가져오기
    loadCleanHouses();
}

/**
 * 클린하우스 데이터 로드
 */
async function loadCleanHouses() {
    try {
        const data = await getNearbyCleanHouses(currentPosition.lat, currentPosition.lng);
        allCleanHouses = data;
        
        console.log(`📦 ${data.length}개의 클린하우스 데이터 로드됨`);
        
        if (data.length === 0) {
            console.warn('⚠️ 주변에 클린하우스가 없습니다.');
            // 빈 상태 표시
            const distanceText = document.querySelector('.location-info h4');
            const addressText = document.querySelector('.location-info p');
            if (distanceText) {
                distanceText.textContent = '주변에 클린하우스를 찾을 수 없습니다';
            }
            if (addressText) {
                addressText.textContent = '다른 위치에서 시도해보세요';
            }
            return;
        }
        
        // 거리 순으로 정렬하고 가까운 5개만 표시
        const nearbyHouses = allCleanHouses
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 5);
        
        displayCleanHouses(nearbyHouses);
        
        // 가장 가까운 클린하우스 정보 표시
        if (nearbyHouses.length > 0) {
            updateCleanHouseInfo(nearbyHouses[0]);
        }

    } catch (error) {
        console.error('❌ 클린하우스 데이터 로드 실패:', error);
    }
}

/**
 * 클린하우스 마커 표시
 */
function displayCleanHouses(cleanHouses) {
    // 기존 마커 제거
    markers.forEach(marker => marker.setMap(null));
    markers = [];

    // 새 마커 추가
    cleanHouses.forEach((house) => {
        const markerPosition = new kakao.maps.LatLng(house.lat, house.lng);
        
        const marker = new kakao.maps.Marker({
            position: markerPosition,
            map: map,
            title: house.name
        });

        // 마커 클릭 이벤트
        kakao.maps.event.addListener(marker, 'click', () => {
            console.log(`🏠 클린하우스 선택: ${house.name}`);
            updateCleanHouseInfo(house);
        });

        markers.push(marker);
    });

    console.log(`📍 ${cleanHouses.length}개 마커 표시 완료`);
}

/**
 * 클린하우스 정보 업데이트 (기존 HTML 요소 업데이트)
 */
function updateCleanHouseInfo(house) {
    // 거리 및 주소 업데이트
    const distanceText = document.querySelector('.location-info h4');
    const addressText = document.querySelector('.location-info p');
    
    if (distanceText) {
        distanceText.textContent = `${house.distance}m 거리에 클린하우스가 있습니다`;
    }
    if (addressText) {
        addressText.textContent = house.address;
    }

    // 운영 시간 업데이트
    const operatingHours = document.querySelector('.info-grid .tag-pink');
    if (operatingHours) {
        operatingHours.textContent = house.operatingHours;
    }

    // 오늘 배출 가능한 재활용품 업데이트 (제주도 요일별 규정 - 모든 클린하우스 동일)
    const availableTypesContainer = document.querySelector('.info-item:last-child');
    if (availableTypesContainer) {
        // 기존 태그 제거
        const existingTags = availableTypesContainer.querySelectorAll('.tag');
        existingTags.forEach(tag => tag.remove());

        // 오늘 요일에 따라 배출 가능한 품목 표시 (클린하우스와 무관)
        const todayTypes = getTodayAvailableTypes();
        
        todayTypes.forEach((type, index) => {
            const tag = document.createElement('span');
            tag.className = `tag ${index % 2 === 0 ? 'tag-blue' : 'tag-red'}`;
            tag.textContent = getTypeLabel(type);
            availableTypesContainer.appendChild(tag);
        });
    }

    console.log(`✅ 클린하우스 정보 업데이트: ${house.name}`);
}

/**
 * 특정 쓰레기 타입으로 필터링 (A가 분석 완료 시 호출)
 * @param {string} wasteType - 쓰레기 종류 (PET, CAN 등)
 */
export function filterCleanHouses(wasteType) {
    console.log(`🔍 [Map] ${wasteType} 배출 가능한 클린하우스 필터링`);

    // 오늘 요일에 배출 가능한 품목 확인
    const todayTypes = getTodayAvailableTypes();
    
    if (!todayTypes.includes(wasteType)) {
        alert(`⚠️ 오늘은 ${getTypeLabel(wasteType)}를 배출할 수 없는 날입니다.\n오늘 배출 가능: ${todayTypes.map(t => getTypeLabel(t)).join(', ')}`);
        return;
    }

    // 모든 클린하우스가 오늘 배출 가능하므로 필터링 불필요
    // 가까운 5개만 표시
    const nearbyHouses = allCleanHouses
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);

    displayCleanHouses(nearbyHouses);

    if (nearbyHouses.length > 0) {
        updateCleanHouseInfo(nearbyHouses[0]);
    }
}

/**
 * 지도 로드 에러 표시
 */
function showMapError() {
    const mapContainer = document.getElementById('map-container');
    mapContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #999;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 48px; color: #f44336;"></i>
            <p style="margin-top: 16px;">지도를 불러올 수 없습니다.</p>
            <p style="font-size: 12px;">Kakao Map API 키를 확인해주세요.</p>
        </div>
    `;
}

/**
 * 제주도 요일별 배출 가능 품목 확인 (모든 클린하우스 동일)
 * @returns {Array} 오늘 배출 가능한 품목
 */
function getTodayAvailableTypes() {
    const today = new Date().getDay(); // 0(일) ~ 6(토)
    
    // 제주도 요일별 배출 규정 (모든 클린하우스 동일)
    const schedule = {
        0: ['PLASTIC', 'VINYL', 'GLASS', 'CAN'],  // 일요일
        1: ['PLASTIC', 'GLASS', 'CAN'],            // 월요일
        2: ['PAPER', 'GLASS', 'CAN'],              // 화요일
        3: ['PLASTIC', 'GLASS', 'CAN'],            // 수요일
        4: ['PAPER', 'VINYL', 'GLASS', 'CAN'],     // 목요일
        5: ['PLASTIC', 'GLASS', 'CAN'],            // 금요일
        6: ['PAPER', 'GLASS', 'CAN']               // 토요일
    };
    
    return schedule[today] || [];
}

/**
 * 쓰레기 종류 한글 라벨
 */
function getTypeLabel(type) {
    const labels = {
        'PET': '페트병',
        'CAN': '캔/고철류',
        'PAPER': '종이',
        'GLASS': '병류',
        'PLASTIC': '플라스틱',
        'VINYL': '비닐',
        'ALL': '전체'
    };
    return labels[type] || type;
}

