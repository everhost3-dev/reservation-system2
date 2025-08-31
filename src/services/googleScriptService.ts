import { GOOGLE_SCRIPT_URL } from '../constants';
import { Reservation, AttendanceRecord, StudyRecord, MileageSummary } from '../types';

async function postToAction(action: string, data: object): Promise<any> {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                // Use text/plain to avoid CORS preflight request which can fail with Google Scripts
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({ action, ...data }),
        });

        const responseText = await response.text();

        if (response.ok) {
            try {
                return JSON.parse(responseText);
            } catch (error) {
                console.error('Failed to parse JSON from response:', responseText);
                throw new Error('Invalid response format from server.');
            }
        } else {
            console.error(`Google Script ${action} error:`, response.status, response.statusText, responseText);
            throw new Error(`Failed to ${action}. Server responded with an error.`);
        }
    } catch (error) {
        console.error(`Error during Google Script ${action}:`, error);
        if (error instanceof Error && error.message.includes('Failed to fetch')) {
             throw new Error('서버 연결에 실패했습니다. 네트워크 연결을 확인하거나 Google Script 배포 설정(CORS)을 확인해주세요.');
        }
        throw error;
    }
}

export const getTodayReservations = async (date: string): Promise<Reservation[]> => {
    const result = await postToAction('getTodayReservations', { date });
    return result.success ? result.reservations || [] : [];
};

export const saveReservation = async (sheetsData: (string|number)[]): Promise<any> => {
    return await postToAction('saveReservation', { data: sheetsData });
};

export const cancelReservation = async (reservationId: string, studentId: string, name: string): Promise<any> => {
    return await postToAction('cancelReservation', { reservationId, studentId, name });
};

export const saveAttendance = async (sheetsData: (string|number)[]): Promise<any> => {
    return await postToAction('saveAttendance', { data: sheetsData });
};

export const getFullData = async (): Promise<{ reservations: Reservation[], attendance: AttendanceRecord[] }> => {
    const result = await postToAction('getFullData', {});
    return result.success ? { reservations: result.reservations || [], attendance: result.attendance || [] } : { reservations: [], attendance: [] };
};

export const exportDataToSheets = async (data: { daily: StudyRecord[], mileage: MileageSummary[] }): Promise<any> => {
    return await postToAction('exportDataToSheets', { data });
};