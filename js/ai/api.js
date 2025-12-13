/**
 * AI 백엔드 API 통신 모듈
 */

// ⚙️ 백엔드 서버 주소
// B 방식(친구 PC 백엔드 사용): 친구 PC의 로컬 IP로 설정하세요.
// 예) http://172.20.14.208:8000
const API_BASE_URL = 'http://172.20.14.208:8000';
console.log('🔥🔥🔥 [API.JS 로드됨!] 백엔드 주소:', API_BASE_URL, '🔥🔥🔥');

/**
 * 이미지 파일을 백엔드로 전송하여 AI 분석 결과 받기
 * @param {File} imageFile - 업로드된 이미지 파일
 * @returns {Promise<Object>} 분석 결과 { category, is_dirty, message, confidence }
 */
export async function analyzeImage(imageFile) {
    try {
        console.log('📤 이미지 분석 요청 중...', imageFile.name);

        // FormData로 이미지 전송
        const formData = new FormData();
        formData.append('file', imageFile);

        const response = await fetch(`${API_BASE_URL}/api/predict`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ 분석 완료:', result);

        // 백엔드 응답을 프론트엔드 형식으로 변환
        const categoryMap = {
            'Plastic': '플라스틱',
            'Can': '캔/고철류',
            'Glass': '병류',
            'Paper': '종이류',
            'Vinyl': '비닐류',
            'Styrofoam': '스티로폼',
        };

        const category = categoryMap[result.category] || result.category;
        const isDirty = result.is_dirty;
        
        // 팁 메시지 생성
        let tip = result.message || "분리수거해주세요.";
        if (isDirty) {
            tip += " 세척 후 배출하면 재활용률이 높아집니다!";
        }

        return {
            type: category,
            tip: tip,
            is_dirty: isDirty,
            confidence: result.confidence,
            raw_category: result.category  // 원본 카테고리 (디버깅용)
        };

    } catch (error) {
        console.error('❌ AI 분석 실패:', error);
        
        // 에러 발생 시 기본값 반환
        return {
            type: "오류",
            tip: `서버 연결에 실패했습니다. 백엔드 서버(${API_BASE_URL})가 실행 중인지 확인해주세요.`,
            error: error.message
        };
    }
}

/**
 * 백엔드 서버 연결 테스트
 * @returns {Promise<boolean>} 연결 성공 여부
 */
export async function testConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/`, {
            method: 'GET',
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ 백엔드 서버 연결 성공!', data.message);
            return true;
        } else {
            console.warn('⚠️ 백엔드 서버 응답 이상:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ 백엔드 서버 연결 실패:', error.message);
        console.error('💡 백엔드 실행 팁: 친구 PC에서 --host 0.0.0.0 으로 실행하고(방화벽 허용), 내 PC에서 IP로 접속 가능해야 합니다.');
        return false;
    }
}

