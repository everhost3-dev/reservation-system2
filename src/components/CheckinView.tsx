import React, { useState, useEffect } from 'react';
import { CheckInData, Reservation } from '../types';
import * as googleScriptService from '../services/googleScriptService';
import { validateStudentId, parseTimeRange } from '../utils/helpers';
import { TIME_SLOTS } from '../constants';
import Spinner from './common/Spinner';

interface CheckinViewProps {
    onExit: () => void;
}

const CheckinView: React.FC<CheckinViewProps> = ({ onExit }) => {
    const [checkInData, setCheckInData] = useState<CheckInData>({ studentId: '', name: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [todayReservations, setTodayReservations] = useState<Reservation[]>([]);
    const [result, setResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

    useEffect(() => {
        const loadReservations = async () => {
            try {
                const today = new Date().toISOString().split('T')[0];
                const reservations = await googleScriptService.getTodayReservations(today);
                setTodayReservations(reservations);
            } catch (error) {
                console.error("Failed to load reservations for check-in", error);
                setResult({ success: false, message: "예약 정보를 불러오는 데 실패했습니다." });
            } finally {
                setIsLoadingData(false);
            }
        };
        loadReservations();
    }, []);

    const handleCheckInOut = async (action: 'checkin' | 'checkout') => {
        setResult(null);
        if (!checkInData.studentId || !checkInData.name) {
            setResult({ success: false, message: '학번과 이름을 모두 입력해주세요.' });
            return;
        }
        if (!validateStudentId(checkInData.studentId).isValid) {
            setResult({ success: false, message: '학번이 유효하지 않습니다 (5자리 숫자).' });
            return;
        }

        if (action === 'checkin') {
            const now = new Date();
            // Find reservations for this student today
            const studentReservations = todayReservations.filter(
                r => r.studentId === checkInData.studentId.trim() && r.name === checkInData.name.trim()
            );

            if (studentReservations.length === 0) {
                setResult({ success: false, message: '오늘 예약된 정보가 없습니다. 먼저 예약을 진행해주세요.' });
                return;
            }

            // Check if any reservation is currently active for check-in
            const validReservation = studentReservations.find(r => {
                const timeSlotInfo = TIME_SLOTS.find(ts => ts.label === r.timeSlot);
                if (!timeSlotInfo) return false;

                const reservationDate = new Date(r.date);
                reservationDate.setHours(0, 0, 0, 0);

                const [startTime, endTime] = parseTimeRange(timeSlotInfo.time, reservationDate);
                const checkinStartTime = new Date(startTime.getTime() - 30 * 60 * 1000); // 30 min grace period

                return now >= checkinStartTime && now <= endTime;
            });

            if (!validReservation) {
                setResult({ success: false, message: '체크인 가능한 예약 시간이 아닙니다. 예약 시간을 확인해주세요.' });
                return;
            }
        }

        setIsLoading(true);
        const now = new Date();
        const sheetsData = [
            now.toISOString().split('T')[0], // YYYY-MM-DD date format
            checkInData.studentId,
            checkInData.name,
            action === 'checkin' ? '체크인' : '체크아웃',
            now.toLocaleTimeString('en-GB'), // HH:MM:SS 24-hour format
            '자기주도학습실' // This can be made dynamic if needed in the future
        ];

        try {
            await googleScriptService.saveAttendance(sheetsData);
            setResult({
                success: true,
                message: `${action === 'checkin' ? '체크인' : '체크아웃'}이(가) 완료되었습니다!`,
                details: { ...checkInData, time: new Date().toLocaleTimeString('ko-KR'), action }
            });
            setCheckInData({ studentId: '', name: '' });
        } catch (error) {
            setResult({ success: false, message: '처리 중 오류가 발생했습니다.' });
        } finally {
            setIsLoading(false);
        }
    };
    
    if (isLoadingData) {
        return <div className="flex justify-center items-center h-screen"><Spinner colorClass="border-blue-500" /> <span className="ml-2">예약 정보 로딩 중...</span></div>;
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-md">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold">✅ 체크인/체크아웃</h1>
                <button onClick={onExit} className="p-2 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    🏠
                </button>
            </div>

            {result && (
                <div className={`mb-6 p-4 rounded-lg ${result.success ? 'bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-100' : 'bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-100'}`}>
                    <p className="font-medium">{result.message}</p>
                    {result.success && result.details && (
                        <div className="mt-2 text-sm">
                            <p><strong>학생:</strong> {result.details.name} ({result.details.studentId})</p>
                            <p><strong>시간:</strong> {result.details.time}</p>
                            <p><strong>행동:</strong> {result.details.action}</p>
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-6">
                <div className="space-y-4">
                    <input type="text" value={checkInData.studentId} onChange={e => setCheckInData({ ...checkInData, studentId: e.target.value })} placeholder="학번" className="w-full p-3 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600" />
                    <input type="text" value={checkInData.name} onChange={e => setCheckInData({ ...checkInData, name: e.target.value })} placeholder="이름" className="w-full p-3 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleCheckInOut('checkin')} disabled={isLoading} className="bg-green-500 text-white py-4 rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 flex justify-center items-center">
                        {isLoading ? <Spinner /> : '✅ 체크인'}
                    </button>
                    <button onClick={() => handleCheckInOut('checkout')} disabled={isLoading} className="bg-orange-500 text-white py-4 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 flex justify-center items-center">
                        {isLoading ? <Spinner /> : '🚪 체크아웃'}
                    </button>
                </div>
            </div>
            <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                <p>체크인은 예약된 시간 30분 전부터 가능합니다.</p>
                <p>체크아웃은 별도의 예약 확인 없이 가능합니다.</p>
            </div>
        </div>
    );
};

export default CheckinView;