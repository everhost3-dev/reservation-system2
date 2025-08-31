import { TimeSlot } from './types';

export const ADMIN_PASSWORD = 'teacher2024';
export const CHECKIN_PASSWORD = 'checkin123';

// 중요! 아래 'https://...' 부분을 1단계에서 배포하고 얻은 본인의 Google Script URL로 반드시 교체해주세요.
// 이 주소가 틀리면 앱이 데이터를 불러오거나 저장할 수 없습니다.
export const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw6tpr6B4D5a-Q3nWlDrY5kLAgvKWzDlZRJ8sjx5eWo9blC-7ACOJgGC73EkGgytT5_/exec'; // <-- 여기에 1단계에서 복사한 선생님의 URL을 붙여넣으세요!

export const LOCATIONS = ['스터디룸', '영글터 집중학습실', '영글터 자율학습실', '채움터'];

export const TIME_SLOTS: TimeSlot[] = [
    { id: 'lunch', label: '점심', time: '12:30-13:30' },
    { id: 'period8', label: '8교시', time: '16:40-17:30' },
    { id: 'dinner', label: '저녁', time: '17:30-18:30' },
    { id: 'study1', label: '야자1부', time: '18:30-20:00' },
    { id: 'study2', label: '야자2부', time: '20:10-21:30' }
];

export const TIME_SLOT_LIMITS: { [key: string]: number } = {
    lunch: 12 * 60 + 20,    // 12:20
    period8: 16 * 60 + 30,  // 16:30
    dinner: 17 * 60 + 20,   // 17:20
    study1: 18 * 60 + 20,   // 18:20
    study2: 20 * 60 + 0     // 20:00
};