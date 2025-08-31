import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, FormData, Reservation, TeamMember } from '../types';
import { LOCATIONS, TIME_SLOTS } from '../constants';
import * as googleScriptService from '../services/googleScriptService';
import { getSeatCount, isTimeSlotBookingAllowed, validateStudentId, getAvailableDates, requestNotificationPermission, scheduleNotification } from '../utils/helpers';
import Header from './Header';
import Spinner from './common/Spinner';
import SeatButton from './common/SeatButton';
import useCurrentTime from '../hooks/useCurrentTime';

interface BookingViewProps {
    setView: (view: View) => void;
    darkMode: boolean;
    setDarkMode: (dark: boolean) => void;
}

const BookingView: React.FC<BookingViewProps> = ({ setView, darkMode, setDarkMode }) => {
    const currentTime = useCurrentTime();
    const [formData, setFormData] = useState<FormData>({
        location: '', seat: '', timeSlot: '', studentId: '', name: '',
        date: new Date().toISOString().split('T')[0],
        teamMembers: Array(5).fill({ studentId: '', name: '' })
    });
    const [isLoading, setIsLoading] = useState(false);
    const [bookingResult, setBookingResult] = useState<{ success: boolean; message: string; reason: string; details?: any; reservationId?: string } | null>(null);
    const [cancelResult, setCancelResult] = useState<{ success: boolean; message: string; reason: string; details?: any } | null>(null);
    const [todayReservations, setTodayReservations] = useState<Reservation[]>([]);
    const [isLoadingReservations, setIsLoadingReservations] = useState(true);
    const [showCancelForm, setShowCancelForm] = useState(false);
    const [cancelFormData, setCancelFormData] = useState({ studentId: '', name: '', reservationId: '' });
    const [showShareNotification, setShowShareNotification] = useState(false);
    const [wantsNotification, setWantsNotification] = useState(false);

    const loadTodayReservations = useCallback(async (isSilent: boolean = false) => {
        if (!isSilent) {
            setIsLoadingReservations(true);
        }
        try {
            const today = new Date().toISOString().split('T')[0];
            const reservations = await googleScriptService.getTodayReservations(today);
            setTodayReservations(reservations);
        } catch (error) {
            console.error('Failed to load reservations', error);
            if (!isSilent) {
                 alert(`예약 정보를 불러오는 데 실패했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        } finally {
             if (!isSilent) {
                setIsLoadingReservations(false);
            }
        }
    }, []);

    useEffect(() => {
        loadTodayReservations(false); // Initial load

        const intervalId = setInterval(() => {
            loadTodayReservations(true); // Silent polling every 30 seconds
        }, 30000);

        return () => clearInterval(intervalId); // Cleanup on unmount
    }, [loadTodayReservations]);

    const handleShare = useCallback(() => {
        setShowShareNotification(true);
        setTimeout(() => {
            setShowShareNotification(false);
        }, 3000);
    }, []);

    const availableTimeSlots = useMemo(() => TIME_SLOTS.filter(slot => isTimeSlotBookingAllowed(slot.id)), [currentTime]);

    const timeRestrictionMessage = useMemo(() => {
        if (availableTimeSlots.length === 0) {
            return { type: 'error', message: '오늘 예약 가능한 시간대가 없습니다.', detail: '각 시간대는 시작 10분 전까지만 예약 가능합니다.' };
        }
        if (formData.timeSlot && !isTimeSlotBookingAllowed(formData.timeSlot)) {
            const timeSlot = TIME_SLOTS.find(t => t.id === formData.timeSlot);
            return { type: 'error', message: `${timeSlot?.label} 시간대 예약이 마감되었습니다.`, detail: '각 시간대는 시작 10분 전까지만 예약 가능합니다.' };
        }
        return null;
    }, [availableTimeSlots, formData.timeSlot, currentTime]);

    const isSeatAvailable = (location: string, seat: string, timeSlotLabel: string) => {
        return !todayReservations.some(r => r.location === location && r.seat === seat && r.timeSlot === timeSlotLabel);
    };

    const handleSubmit = async () => {
        if (timeRestrictionMessage) {
            setBookingResult({ success: false, message: timeRestrictionMessage.message, reason: timeRestrictionMessage.detail });
            return;
        }
        if (!formData.location || !formData.timeSlot || !formData.studentId || !formData.name) {
            setBookingResult({ success: false, message: '모든 필수 항목을 입력해주세요.', reason: '입력 정보 부족' });
            return;
        }
        if (validateStudentId(formData.studentId).isValid === false) {
             setBookingResult({ success: false, message: '학번이 유효하지 않습니다 (5자리 숫자).', reason: '학번 형식 오류' });
             return;
        }
        const isStudyRoom = formData.location === '스터디룸';
        if (!isStudyRoom && !formData.seat) {
             setBookingResult({ success: false, message: '좌석을 선택해주세요.', reason: '좌석 미선택' });
             return;
        }

        setIsLoading(true);
        const selectedTimeSlot = TIME_SLOTS.find(t => t.id === formData.timeSlot);
        if (!isStudyRoom && !isSeatAvailable(formData.location, formData.seat, selectedTimeSlot!.label)) {
            setBookingResult({ success: false, message: '선택하신 좌석이 이미 예약되어 있습니다.', reason: '좌석 중복' });
            setIsLoading(false);
            return;
        }
        
        const validTeamMembers = formData.teamMembers.filter(m => m.studentId.trim() && m.name.trim());
        if(isStudyRoom && validTeamMembers.length === 0) {
            setBookingResult({ success: false, message: '스터디룸은 최소 1명 이상의 팀원이 필요합니다.', reason: '팀원 정보 부족' });
            setIsLoading(false);
            return;
        }

        const reservationId = `RES-${Date.now()}`;
        const teamMembersString = validTeamMembers.map(m => `${m.name}(${m.studentId})`).join(', ');
        
        const sheetsData = [
            formData.date,
            formData.studentId,
            formData.name,
            formData.location,
            formData.seat || (isStudyRoom ? '팀룸' : 'N/A'),
            selectedTimeSlot?.label,
            reservationId,
            new Date().toLocaleString('ko-KR'),
            teamMembersString
        ];
        
        try {
            await googleScriptService.saveReservation(sheetsData);
            const newReservation = { ...formData, reservationId, timestamp: new Date().toISOString(), timeSlot: selectedTimeSlot!.label, teamMembers: validTeamMembers };
            setTodayReservations(prev => [...prev, newReservation]);

            let successMessage = '예약이 완료되었습니다!';
            if (wantsNotification) {
                const permission = await requestNotificationPermission();
                if (permission === 'granted') {
                    const [startTime] = selectedTimeSlot!.time.split('-'); // e.g. "12:30"
                    const [hours, minutes] = startTime.split(':').map(Number);
                    
                    const [year, month, day] = formData.date.split('-').map(Number);
                    const reservationStartTime = new Date(year, month - 1, day, hours, minutes);

                    const notificationTime = new Date(reservationStartTime.getTime() - 10 * 60 * 1000); // 10 mins before

                    if (notificationTime > new Date()) {
                        scheduleNotification(
                            '🪑 예약 알림',
                            {
                                body: `${selectedTimeSlot!.label} (${selectedTimeSlot!.time}) 예약 10분 전입니다. 장소: ${formData.location}${formData.seat ? ` ${formData.seat}번` : ''}`,
                                icon: 'https://cdn-icons-png.flaticon.com/512/2991/2991108.png', // Calendar icon
                                tag: reservationId,
                            },
                            notificationTime
                        );
                        successMessage = '예약이 완료되었으며, 10분 전에 알림이 전송됩니다.';
                    } else {
                        successMessage = '예약이 완료되었습니다! (알림: 이미 지난 시간이어서 예약되지 않았습니다)';
                    }
                } else {
                    successMessage = '예약이 완료되었습니다! (알림 권한이 없어 예약되지 않았습니다)';
                }
            }

            setBookingResult({
                success: true, message: successMessage, reason: '정상 처리',
                reservationId, details: { ...newReservation, time: selectedTimeSlot!.time }
            });
            setFormData(prev => ({ ...prev, location: '', seat: '', timeSlot: '', studentId: '', name: '', teamMembers: Array(5).fill({ studentId: '', name: '' }) }));
            setWantsNotification(false);
        } catch (error) {
            setBookingResult({ success: false, message: '예약 중 오류가 발생했습니다.', reason: '서버 오류' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelReservation = async () => {
        if (!cancelFormData.studentId || !cancelFormData.name) {
            setCancelResult({ success: false, message: '학번과 이름을 모두 입력해주세요.', reason: '정보 부족' });
            return;
        }
        if(!validateStudentId(cancelFormData.studentId).isValid) {
            setCancelResult({ success: false, message: '유효하지 않은 학번입니다.', reason: '학번 오류' });
            return;
        }
        setIsLoading(true);
        try {
            const res = await googleScriptService.cancelReservation(cancelFormData.reservationId, cancelFormData.studentId, cancelFormData.name);
            if(res.success) {
                setCancelResult({ success: true, message: '예약이 성공적으로 취소되었습니다.', reason: '정상 처리', details: res.details });
                setTodayReservations(prev => prev.filter(r => r.reservationId !== res.details.reservationId));
                setCancelFormData({ studentId: '', name: '', reservationId: '' });
                setShowCancelForm(false);
            } else {
                setCancelResult({ success: false, message: res.message || '예약 취소에 실패했습니다.', reason: res.reason || '예약 없음' });
            }
        } catch (error) {
             setCancelResult({ success: false, message: '예약 취소 중 오류가 발생했습니다.', reason: '서버 오류' });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-md">
            <Header setView={setView} setShowCancelForm={setShowCancelForm} showCancelForm={showCancelForm} darkMode={darkMode} setDarkMode={setDarkMode} onShare={handleShare} />
            
            {showShareNotification && (
                <div className="fixed top-5 right-5 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg animate-fade-in-out z-50">
                    클립보드에 링크가 복사되었습니다!
                </div>
            )}

            <div className={`mb-6 p-4 rounded-lg ${timeRestrictionMessage ? 'bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-100' : 'bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-100'}`}>
                <div className="flex items-center gap-2">
                    <span>🕐</span>
                    <div>
                        <div className="font-medium">현재 시각: {currentTime.toLocaleTimeString('ko-KR')}</div>
                        <div className="text-sm mt-1">{timeRestrictionMessage ? `${timeRestrictionMessage.message} ${timeRestrictionMessage.detail}` : '각 시간대는 시작 10분 전까지 예약 가능합니다.'}</div>
                        {isLoadingReservations && <div className="text-sm mt-2 flex items-center gap-2"><Spinner/>예약 현황 로딩 중...</div>}
                    </div>
                </div>
            </div>

            {cancelResult && (
                <div className={`mb-6 p-4 rounded-lg ${cancelResult.success ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900'}`}>
                    <p>{cancelResult.message}</p>
                </div>
            )}
            
            {showCancelForm && (
                 <div className="mb-6 p-4 rounded-lg border-2 border-dashed bg-gray-50 border-gray-300 dark:bg-gray-800 dark:border-gray-600">
                     <h3 className="text-lg font-semibold mb-4">🗑️ 예약 취소</h3>
                     <div className="space-y-4">
                        <input type="text" value={cancelFormData.studentId} onChange={e => setCancelFormData({...cancelFormData, studentId: e.target.value})} placeholder="학번" className="w-full p-3 border rounded-lg bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600"/>
                        <input type="text" value={cancelFormData.name} onChange={e => setCancelFormData({...cancelFormData, name: e.target.value})} placeholder="이름" className="w-full p-3 border rounded-lg bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600"/>
                        <button onClick={handleCancelReservation} disabled={isLoading} className="w-full bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 disabled:opacity-50">
                            {isLoading ? <Spinner/> : '예약 취소하기'}
                        </button>
                     </div>
                 </div>
            )}

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-2">📅 예약 날짜</label>
                    <select value={formData.date} disabled className="w-full p-3 border rounded-lg bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600 disabled:opacity-50">
                        {getAvailableDates().map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">📍 학습실 선택</label>
                    <select value={formData.location} onChange={e => setFormData({...formData, location: e.target.value, seat: ''})} className="w-full p-3 border rounded-lg bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600">
                        <option value="">장소를 선택하세요</option>
                        {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                </div>

                {formData.location && formData.location !== '스터디룸' && (
                    <div>
                        <label className="block text-sm font-medium mb-2">좌석 번호</label>
                        <div className="grid grid-cols-5 gap-2">
                            {Array.from({ length: getSeatCount(formData.location) }, (_, i) => i + 1).map(seat => {
                                const selectedTimeSlotLabel = TIME_SLOTS.find(t => t.id === formData.timeSlot)?.label || '';
                                const isAvailable = !formData.timeSlot || isSeatAvailable(formData.location, seat.toString(), selectedTimeSlotLabel);
                                return <SeatButton key={seat} seat={seat} isAvailable={isAvailable} isSelected={formData.seat === seat.toString()} onClick={() => isAvailable && setFormData({...formData, seat: seat.toString()})}/>;
                            })}
                        </div>
                    </div>
                )}
                
                {formData.location === '스터디룸' && (
                     <div>
                         <label className="block text-sm font-medium mb-2">👥 팀원 정보 (최대 5명)</label>
                         <div className="space-y-3">
                             {formData.teamMembers.map((member, index) => (
                                 <div key={index} className="grid grid-cols-2 gap-3">
                                     <input type="text" value={member.studentId} onChange={e => {
                                         const newMembers = [...formData.teamMembers];
                                         newMembers[index] = {...newMembers[index], studentId: e.target.value};
                                         setFormData({...formData, teamMembers: newMembers});
                                     }} placeholder={`팀원 ${index + 1} 학번`} className="p-3 border rounded-lg bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600"/>
                                      <input type="text" value={member.name} onChange={e => {
                                         const newMembers = [...formData.teamMembers];
                                         newMembers[index] = {...newMembers[index], name: e.target.value};
                                         setFormData({...formData, teamMembers: newMembers});
                                     }} placeholder={`팀원 ${index + 1} 이름`} className="p-3 border rounded-lg bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600"/>
                                 </div>
                             ))}
                         </div>
                     </div>
                )}

                <div>
                    <label className="block text-sm font-medium mb-2">🕐 이용 시간대</label>
                    <div className="grid grid-cols-2 gap-2">
                        {availableTimeSlots.map(slot => (
                            <button key={slot.id} onClick={() => setFormData({...formData, timeSlot: slot.id})} className={`p-3 rounded-lg border text-center ${formData.timeSlot === slot.id ? 'bg-blue-500 text-white border-blue-500' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'}`}>
                                <div className="font-medium">{slot.label}</div>
                                <div className="text-xs opacity-75">{slot.time}</div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                     <input type="text" value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})} placeholder="학번" className="w-full p-3 border rounded-lg bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600"/>
                     <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="이름" className="w-full p-3 border rounded-lg bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600"/>
                </div>

                <div className="flex items-center justify-center my-4">
                    <input
                        id="notification-checkbox"
                        type="checkbox"
                        checked={wantsNotification}
                        onChange={(e) => setWantsNotification(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="notification-checkbox" className="ml-2 block text-sm font-medium">
                        ⏰ 10분 전에 알림 받기
                    </label>
                </div>

                <button onClick={handleSubmit} disabled={isLoading || !!timeRestrictionMessage} className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50">
                    {isLoading ? <Spinner/> : '📅 예약하기'}
                </button>
            </div>
            {bookingResult && (
                <div className={`mt-6 p-4 rounded-lg ${bookingResult.success ? 'bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-100' : 'bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-100'}`}>
                   <p className="font-medium">{bookingResult.message}</p>
                   {bookingResult.success && bookingResult.details && (
                       <div className="mt-3 p-3 bg-black bg-opacity-20 rounded text-sm space-y-1">
                           <p><strong>예약번호:</strong> {bookingResult.reservationId}</p>
                           <p><strong>장소:</strong> {bookingResult.details.location} {bookingResult.details.seat && `${bookingResult.details.seat}번`}</p>
                           <p><strong>시간:</strong> {bookingResult.details.timeSlot} ({bookingResult.details.time})</p>
                           <p><strong>예약자:</strong> {bookingResult.details.name} ({bookingResult.details.studentId})</p>
                           {bookingResult.details.teamMembers.length > 0 && <p><strong>팀원:</strong> {bookingResult.details.teamMembers.map((m: TeamMember) => `${m.name}(${m.studentId})`).join(', ')}</p>}
                       </div>
                   )}
                </div>
            )}
        </div>
    );
};

export default BookingView;