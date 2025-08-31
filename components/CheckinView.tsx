import React, { useState } from 'react';
import { CheckInData } from '../types';
import * as googleScriptService from '../services/googleScriptService';
import { validateStudentId } from '../utils/helpers';
import Spinner from './common/Spinner';

interface CheckinViewProps {
    onExit: () => void;
}

const CheckinView: React.FC<CheckinViewProps> = ({ onExit }) => {
    const [checkInData, setCheckInData] = useState<CheckInData>({ studentId: '', name: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

    const handleCheckInOut = async (action: 'checkin' | 'checkout') => {
        if (!checkInData.studentId || !checkInData.name) {
            setResult({ success: false, message: '학번과 이름을 모두 입력해주세요.' });
            return;
        }
        if (!validateStudentId(checkInData.studentId).isValid) {
            setResult({ success: false, message: '학번이 유효하지 않습니다 (5자리 숫자).' });
            return;
        }

        setIsLoading(true);
        const sheetsData = [
            new Date().toLocaleDateString('ko-KR'),
            checkInData.studentId,
            checkInData.name,
            action === 'checkin' ? '체크인' : '체크아웃',
            new Date().toLocaleTimeString('ko-KR'),
            '자기주도학습실'
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

    return (
        <div className="container mx-auto px-4 py-8 max-w-md">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold">✅ 체크인/체크아웃</h1>
                <button onClick={onExit} className="p-2 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    🏠
                </button>
            </div>

            {result && (
                <div className={`mb-6 p-4 rounded-lg ${result.success ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900'}`}>
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
        </div>
    );
};

export default CheckinView;