import React from 'react';
import { Reservation, StudyRecord } from '../types';
import { TIME_SLOTS } from '../constants';
import { roomLayouts, RoomLayout, SeatLayoutCell } from './common/layouts';

interface SeatLayoutProps {
    location: string;
    selectedSeat?: string;
    selectedTimeSlot: string;
    onSeatSelect?: (seat: string) => void;
    reservations: (Reservation | StudyRecord)[];
    readOnly?: boolean;
    showStudentNames?: boolean;
}

const SeatLayout: React.FC<SeatLayoutProps> = ({
    location,
    selectedSeat,
    selectedTimeSlot,
    onSeatSelect,
    reservations,
    readOnly = false,
    showStudentNames = false,
}) => {
    const layout: RoomLayout | undefined = roomLayouts[location];

    if (!layout) {
        return <p className="text-center text-gray-500">해당 장소의 좌석 배치도 정보가 없습니다.</p>;
    }

    const getReservationForSeat = (seatNumber: number) => {
        if (!selectedTimeSlot) return null;
        const selectedTimeSlotLabel = TIME_SLOTS.find(t => t.id === selectedTimeSlot)?.label || '';
        return reservations.find(
            r => r.location === location && r.seat === seatNumber.toString() && r.timeSlot === selectedTimeSlotLabel
        );
    };

    const getCellContent = (cell: SeatLayoutCell, cellIndex: number) => {
        switch (cell.type) {
            case 'seat':
                const seatStr = cell.number!.toString();
                const reservation = getReservationForSeat(cell.number!);
                const isAvailable = !reservation;
                const isSelected = selectedSeat === seatStr;

                const hasName = showStudentNames && reservation;
                const baseClasses = `flex flex-col items-center justify-center rounded-lg border-2 transition-all text-sm ${hasName ? 'w-14 h-14' : 'w-10 h-10'}`;
                let stateClasses = '';

                if (!readOnly && isSelected) {
                    stateClasses = 'bg-blue-500 text-white border-blue-500 scale-110 shadow-lg';
                } else if (isAvailable) {
                    stateClasses = `bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 ${!readOnly ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer' : 'cursor-default'}`;
                } else {
                    stateClasses = 'bg-red-100 border-red-300 text-red-600 cursor-not-allowed dark:bg-red-900/50 dark:border-red-700 dark:text-red-300';
                }

                if (!selectedTimeSlot && !readOnly) {
                     stateClasses += ' opacity-50 cursor-not-allowed';
                }

                return (
                    <div key={`seat-${cell.number}`} className="p-0.5 flex-shrink-0">
                        <button
                            onClick={() => onSeatSelect && onSeatSelect(seatStr)}
                            disabled={readOnly || !isAvailable || (!selectedTimeSlot && !readOnly)}
                            className={`${baseClasses} ${stateClasses}`}
                            aria-label={`Seat ${cell.number}`}
                        >
                            <div className="font-bold text-base">{cell.number}</div>
                            {hasName && (
                                <div className="text-[10px] mt-0.5 px-1 w-full truncate" title={reservation.name}>{reservation.name}</div>
                            )}
                        </button>
                    </div>
                );

            case 'label':
                return (
                    <div key={`label-${cellIndex}`} className="p-0.5 flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs w-full" style={{ gridColumn: `span ${cell.span || 1}` }}>
                         <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 w-full text-center">{cell.text}</div>
                    </div>
                );

            case 'space':
                 return <div key={`space-${cellIndex}`} className="p-0.5" style={{ gridColumn: `span ${cell.span || 1}` }} />;

            default:
                return null;
        }
    };

    return (
        <div className="p-3 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
             {!readOnly && !selectedTimeSlot && (
                <div className="text-center text-sm text-yellow-600 dark:text-yellow-400 mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/50 rounded-md">
                   시간대를 먼저 선택해야 좌석을 지정할 수 있습니다.
                </div>
            )}
            <div className="flex flex-col items-center gap-1">
                {layout.map((row, rowIndex) => (
                    <div key={`row-${rowIndex}`} className="flex justify-center items-stretch w-full gap-1">
                         {row.map(getCellContent)}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SeatLayout;