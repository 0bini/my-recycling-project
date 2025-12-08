/**
 * main.js
 * A와 B의 모듈을 각각 import하여 초기화
 */

// TODO: A가 만든 AI 화면 함수 (개발자 A가 작업 예정)
// import { renderInitialScreen } from './ai/view.js';

// B가 만든 지도 초기화 함수 (당신의 작업)
import { initMap } from './map/map.js';

// 앱 시작
console.log("🚀 앱이 시작되었습니다.");

// TODO: AI 화면 초기화 (개발자 A가 작업 후 주석 해제)
// renderInitialScreen();

// 지도 초기화 (당신의 작업)
console.log("🗺️ Map 모듈 초기화...");
initMap();