import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Reservation, AttendanceRecord, StudyRecord, MileageSummary } from '../types';
import { TIME_SLOTS } from '../constants';
import * as googleScriptService from '../services/googleScriptService';
import { parseTimeRange, calculateMileage } from '../utils/helpers';
import Spinner from './common/Spinner';

interface AdminDashboardViewProps {
    onLogout: () => void;
}

const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onLogout }) => {
    const [allReservations, setAllReservations] = useState<Reservation[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('reservations');
    const [enabledTimeSlots, setEnabledTimeSlots] = useState<{ [key: string]: boolean }>({
        lunch: true, period8: false, dinner: true, study1: true, study2: true
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [timeSlotFilter, setTimeSlotFilter] = useState('all');


    const fetchData = useCallback(async (isSilent: boolean = false) => {
        if (!isSilent) setIsLoading(true);
        try {
            const { reservations, attendance } = await googleScriptService.getFullData();
            setAllReservations(reservations);
            setAttendanceRecords(attendance);
        } catch (error) {
            console.error("Failed to fetch admin data", error);
            if (!isSilent) alert('데이터를 불러오는 데 실패했습니다.');
        } finally {
            if (!isSilent) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(false);
        const intervalId = setInterval(() => fetchData(true), 30000);
        return () => clearInterval(intervalId);
    }, [fetchData]);

    const studyRecords = useMemo((): StudyRecord[] => {
        const studentAttendance: { [key: string]: AttendanceRecord[] } = {};
        attendanceRecords.forEach(att => {
            if (!studentAttendance[att.studentId]) studentAttendance[att.studentId] = [];
            studentAttendance[att.studentId].push(att);
        });

        for (const studentId in studentAttendance) {
            studentAttendance[studentId].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        }

        return allReservations.map(res => {
            const timeSlotInfo = TIME_SLOTS.find(ts => ts.label === res.timeSlot);
            if (!timeSlotInfo) return { ...res, status: 'Reserved', mileagePoints: 0 };

            const reservationDate = new Date(res.date);
            reservationDate.setHours(0, 0, 0, 0);

            const [reservationStart, reservationEnd] = parseTimeRange(timeSlotInfo.time, reservationDate);
            const studentHistory = studentAttendance[res.studentId] || [];
            
            const gracePeriodStart = new Date(reservationStart.getTime() - 30 * 60 * 1000);
            const checkIn = studentHistory.find(att => 
                att.action === 'checkin' &&
                new Date(att.timestamp) >= gracePeriodStart && 
                new Date(att.timestamp) <= reservationEnd
            );

            if (!checkIn) {
                const status = reservationEnd < new Date() ? 'No-Show' : 'Reserved';
                return { ...res, status, mileagePoints: 0 };
            }

            const checkOut = studentHistory.find(att =>
                att.action === 'checkout' && new Date(att.timestamp) > new Date(checkIn.timestamp)
            );

            if (!checkOut) {
                 let points = 0;
                 if (timeSlotInfo.id === 'study1' || timeSlotInfo.id === 'study2') {
                     points = 2;
                 }
                return {
                    ...res, status: 'In-Progress',
                    checkinTime: new Date(checkIn.timestamp).toLocaleTimeString('ko-KR'),
                    mileagePoints: points
                };
            }

            const checkInTime = new Date(checkIn.timestamp);
            const checkOutTime = new Date(checkOut.timestamp);
            const studyStart = Math.max(checkInTime.getTime(), reservationStart.getTime());
            const studyEnd = Math.min(checkOutTime.getTime(), reservationEnd.getTime());
            const durationMinutes = studyEnd > studyStart ? Math.round((studyEnd - studyStart) / (1000 * 60)) : 0;
            const mileagePoints = calculateMileage(res.timeSlot, durationMinutes);
            
            return {
                ...res, status: 'Attended',
                checkinTime: checkInTime.toLocaleTimeString('ko-KR'),
                checkoutTime: checkOutTime.toLocaleTimeString('ko-KR'),
                studyDurationMinutes: durationMinutes, mileagePoints
            };
        });
    }, [allReservations, attendanceRecords]);

    const mileageSummaryData = useMemo((): MileageSummary[] => {
        const studentPoints: { [studentId: string]: MileageSummary } = {};
        studyRecords.forEach(record => {
            if (!studentPoints[record.studentId]) {
                studentPoints[record.studentId] = { studentId: record.studentId, name: record.name, totalMileage: 0, attendedCount: 0, noShowCount: 0, totalStudyMinutes: 0 };
            }
            const summary = studentPoints[record.studentId];
            summary.name = record.name;
            summary.totalMileage += record.mileagePoints;
            summary.totalStudyMinutes += record.studyDurationMinutes || 0;
            if (record.status === 'Attended' || record.status === 'In-Progress') summary.attendedCount++;
            else if (record.status === 'No-Show') summary.noShowCount++;
        });
        return Object.values(studentPoints).sort((a, b) => b.totalMileage - a.totalMileage);
    }, [studyRecords]);

    const reservationsToShow = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        let filteredData = searchTerm ? studyRecords : studyRecords.filter(r => r.date === todayStr);

        const lowercasedSearchTerm = searchTerm.toLowerCase().trim();
        if (lowercasedSearchTerm) {
            filteredData = studyRecords.filter(r => r.name.toLowerCase().includes(lowercasedSearchTerm) || r.studentId.includes(lowercasedSearchTerm));
        }

        if (timeSlotFilter !== 'all') {
            const timeSlot = TIME_SLOTS.find(ts => ts.id === timeSlotFilter);
            if (timeSlot) {
                filteredData = filteredData.filter(r => r.timeSlot === timeSlot.label);
            }
        }
        
        return filteredData.sort((a, b) => {
            if (a.date !== b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
            const timeA = TIME_SLOTS.find(ts => ts.label === a.timeSlot)?.time.split('-')[0] || '99:99';
            const timeB = TIME_SLOTS.find(ts => ts.label === b.timeSlot)?.time.split('-')[0] || '99:99';
            return timeA.localeCompare(timeB);
        });
    }, [searchTerm, studyRecords, timeSlotFilter]);

    const filteredMileageData = useMemo(() => {
        if (!searchTerm) return mileageSummaryData;
        const lowercasedFilter = searchTerm.toLowerCase().trim();
        return mileageSummaryData.filter(s => s.name.toLowerCase().includes(lowercasedFilter) || s.studentId.includes(lowercasedFilter));
    }, [mileageSummaryData, searchTerm]);

    const toggleTimeSlot = (id: string) => setEnabledTimeSlots(prev => ({ ...prev, [id]: !prev[id] }));

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Spinner colorClass="border-blue-500" /> <span className="ml-2">데이터 로딩 중...</span></div>;
    }
    
    const todayStr = new Date().toISOString().split('T')[0];
    const todayReservationsCount = studyRecords.filter(r => r.date === todayStr).length;
    const todayNoShowCount = studyRecords.filter(r => r.date === todayStr && r.status === 'No-Show').length;
    const checkedInUsersCount = studyRecords.filter(r => r.date === todayStr && r.status === 'In-Progress').length;
    
    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold">📊 관리자 대시보드</h1>
                <button onClick={onLogout} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                    로그아웃
                </button>
            </div>

            <div className="mb-8 p-6 rounded-lg bg-white dark:bg-gray-800 shadow">
                <h2 className="text-xl font-bold mb-4">시간대 관리</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {TIME_SLOTS.map(slot => (
                        <button key={slot.id} onClick={() => toggleTimeSlot(slot.id)}
                            className={`p-4 rounded-lg border-2 text-center transition-all ${ enabledTimeSlots[slot.id] ? 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                            <div className="font-medium">{slot.label}</div>
                            <div className="text-sm">{slot.time}</div>
                            <div className="text-xs mt-2">{enabledTimeSlots[slot.id] ? '활성화' : '비활성화'}</div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-6">
                <input type="search" placeholder="학생 이름 또는 학번으로 검색..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-3 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" aria-label="Search records" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="p-4 rounded-lg bg-white dark:bg-gray-800 shadow"><p>📅 당일 예약: <span className="font-bold text-2xl">{todayReservationsCount}</span></p></div>
                <div className="p-4 rounded-lg bg-white dark:bg-gray-800 shadow"><p>👥 현재 학습중: <span className="font-bold text-2xl text-blue-500">{checkedInUsersCount}</span></p></div>
                <div className="p-4 rounded-lg bg-white dark:bg-gray-800 shadow"><p>🚫 당일 노쇼: <span className="font-bold text-2xl text-red-500">{todayNoShowCount}</span></p></div>
                <div className="p-4 rounded-lg bg-white dark:bg-gray-800 shadow"><p>✅ 총 출석 기록: <span className="font-bold text-2xl">{attendanceRecords.length}</span></p></div>
            </div>
            
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                <button onClick={() => setActiveTab('reservations')} className={`px-4 py-2 text-lg font-semibold ${activeTab === 'reservations' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>{searchTerm ? '예약 검색 결과' : '실시간 예약 현황'}</button>
                <button onClick={() => setActiveTab('mileage')} className={`px-4 py-2 text-lg font-semibold ${activeTab === 'mileage' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>🏆 마일리지 현황</button>
            </div>

            {activeTab === 'reservations' && (
                <div className="p-6 rounded-lg bg-white dark:bg-gray-800 shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">{searchTerm ? `'${searchTerm}' 검색 결과` : '실시간 예약 현황'}</h2>
                        <select value={timeSlotFilter} onChange={e => setTimeSlotFilter(e.target.value)} className="p-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" aria-label="시간대별 필터">
                            <option value="all">모든 시간대</option>
                            {TIME_SLOTS.map(slot => <option key={slot.id} value={slot.id}>{slot.label}</option>)}
                        </select>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-600">
                                    {searchTerm && <th className="text-left p-2">날짜</th>}
                                    <th className="text-left p-2">학번</th><th className="text-left p-2">이름</th><th className="text-left p-2">장소/좌석</th><th className="text-left p-2">시간대</th><th className="text-left p-2">상태</th><th className="text-center p-2">공부 시간</th><th className="text-center p-2">획득 마일리지</th><th className="text-left p-2">팀원</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reservationsToShow.map((r) => {
                                    const statusClasses: { [key: string]: string } = { 'Attended': 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200', 'No-Show': 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200', 'In-Progress': 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200', 'Reserved': 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300' };
                                    return (
                                        <tr key={r.reservationId} className="border-b border-gray-100 dark:border-gray-700">
                                            {searchTerm && <td className="p-2">{r.date.split('T')[0]}</td>}
                                            <td className="p-2">{r.studentId}</td><td className="p-2">{r.name}</td><td className="p-2">{r.location} {r.seat}</td><td className="p-2">{r.timeSlot}</td>
                                            <td className="p-2 text-center"><span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[r.status]}`}>{r.status}</span></td>
                                            <td className="p-2 text-center">{r.studyDurationMinutes != null ? `${r.studyDurationMinutes}분` : '-'}</td>
                                            <td className="p-2 text-center font-semibold">{r.mileagePoints > 0 ? `${r.mileagePoints}점` : '-'}</td>
                                            <td className="p-2 text-xs">{r.teamMembersString || '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {reservationsToShow.length === 0 && <p className="text-center py-4 text-gray-500">{searchTerm ? '검색 결과가 없습니다.' : '해당 조건의 예약이 없습니다.'}</p>}
                    </div>
                </div>
            )}

            {activeTab === 'mileage' && (
                <div className="p-6 rounded-lg bg-white dark:bg-gray-800 shadow">
                    <h2 className="text-xl font-bold mb-4">🏆 마일리지 랭킹</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-600">
                                    <th className="text-center p-2">순위</th><th className="text-left p-2">학번</th><th className="text-left p-2">이름</th><th className="text-center p-2">총 마일리지</th><th className="text-center p-2">총 공부 시간</th><th className="text-center p-2">출석 횟수</th><th className="text-center p-2">노쇼 횟수</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMileageData.map((student, index) => (
                                    <tr key={student.studentId} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="p-2 font-bold text-center w-16">{searchTerm ? '-' : (index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1)}</td>
                                        <td className="p-2">{student.studentId}</td><td className="p-2">{student.name}</td>
                                        <td className="p-2 font-semibold text-blue-500 dark:text-blue-400 text-center">{student.totalMileage} 점</td>
                                        <td className="p-2 text-center">{Math.floor(student.totalStudyMinutes / 60)}시간 {student.totalStudyMinutes % 60}분</td>
                                        <td className="p-2 text-center text-green-600">{student.attendedCount}회</td>
                                        <td className="p-2 text-center text-red-600">{student.noShowCount > 0 ? `${student.noShowCount}회` : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredMileageData.length === 0 && <p className="text-center py-4 text-gray-500">{searchTerm ? '검색 결과가 없습니다.' : '마일리지 데이터가 없습니다.'}</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboardView;