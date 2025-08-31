export enum View {
    Booking = 'booking',
    AdminLogin = 'admin-login',
    AdminDashboard = 'admin-dashboard',
    CheckinLogin = 'checkin-login',
    Checkin = 'checkin',
}

export interface TeamMember {
    studentId: string;
    name: string;
}

export interface FormData {
    location: string;
    seat: string;
    timeSlot: string;
    studentId: string;
    name: string;
    date: string;
    teamMembers: TeamMember[];
}

export interface Reservation {
    date: string;
    studentId: string;
    name: string;
    location: string;
    seat: string;
    timeSlot: string;
    reservationId: string;
    timestamp: string;
    teamMembers: TeamMember[];
    teamMembersString?: string;
}

export interface CheckInData {
    studentId: string;
    name: string;
}

export interface AttendanceRecord {
    studentId: string;
    name: string;
    action: 'checkin' | 'checkout';
    timestamp: string;
    location: string;
}

export interface TimeSlot {
    id: string;
    label: string;
    time: string;
}

// Represents a reservation record enriched with attendance data and calculated metrics.
export interface StudyRecord extends Reservation {
    status: 'Attended' | 'No-Show' | 'Reserved' | 'In-Progress';
    checkinTime?: string;
    checkoutTime?: string;
    studyDurationMinutes?: number;
    mileagePoints: number;
}

// Represents a summary of a student's performance for the mileage leaderboard.
export interface MileageSummary {
    studentId: string;
    name:string;
    totalMileage: number;
    attendedCount: number;
    noShowCount: number;
    totalStudyMinutes: number;
}