import { TIME_SLOT_LIMITS, TIME_SLOTS } from '../constants';

export const getSeatCount = (location: string): number => {
    switch (location) {
        case '스터디룸': return 0;
        case '영글터 집중학습실': return 8;
        case '영글터 자율학습실': return 25;
        case '채움터': return 9;
        default: return 0;
    }
};

export const isTimeSlotBookingAllowed = (timeSlotId: string): boolean => {
    const now = new Date();
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    return currentTimeInMinutes <= (TIME_SLOT_LIMITS[timeSlotId] || 9999);
};

export const validateStudentId = (studentId: string): { isValid: boolean; message: string } => {
    if (!studentId || !/^\d{5}$/.test(studentId.trim())) {
        return { isValid: false, message: '학번은 5자리 숫자여야 합니다.' };
    }
    const num = parseInt(studentId.trim(), 10);
    if (num < 10101 || num > 31027) {
        return { isValid: false, message: '학번은 10101부터 31027까지 유효합니다.' };
    }
    return { isValid: true, message: '' };
};

export const getAvailableDates = (): { value: string; label: string }[] => {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    const displayDate = today.toLocaleDateString('ko-KR', {
        month: 'long', day: 'numeric', weekday: 'short'
    });
    return [{ value: dateString, label: `오늘 (${displayDate})` }];
};

/**
 * Parses a time range string (e.g., "12:30-13:30") into two Date objects for a given date.
 * @param timeString The time range string.
 * @param date The date for which the time range applies.
 * @returns A tuple containing the start and end Date objects.
 */
export const parseTimeRange = (timeString: string, date: Date): [Date, Date] => {
    const [startTimeStr, endTimeStr] = timeString.split('-');
    const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
    const [endHours, endMinutes] = endTimeStr.split(':').map(Number);

    const startDate = new Date(date);
    startDate.setHours(startHours, startMinutes, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(endHours, endMinutes, 0, 0);

    return [startDate, endDate];
};

/**
 * Calculates mileage points based on the time slot and study duration.
 * @param timeSlotLabel The label of the reservation time slot (e.g., "점심").
 * @param durationMinutes The calculated study duration in minutes.
 * @returns The number of mileage points awarded.
 */
export const calculateMileage = (timeSlotLabel: string, durationMinutes: number): number => {
    const timeSlot = TIME_SLOTS.find(ts => ts.label === timeSlotLabel);
    if (!timeSlot || durationMinutes < 0) return 0;

    switch (timeSlot.id) {
        case 'lunch':
        case 'dinner':
            return durationMinutes >= 20 ? 1 : 0;
        case 'study1':
        case 'study2':
            // Attendance for any duration in these slots earns 2 points.
            return durationMinutes > 0 ? 2 : 0;
        default:
            return 0;
    }
};