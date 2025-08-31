import React from 'react';

interface SeatButtonProps {
    seat: number;
    isAvailable: boolean;
    isSelected: boolean;
    onClick: () => void;
}

const SeatButton: React.FC<SeatButtonProps> = ({ seat, isAvailable, isSelected, onClick }) => {
    const getClasses = () => {
        if (isSelected) {
            return 'bg-blue-500 text-white border-blue-500';
        }
        if (isAvailable) {
            return 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700';
        }
        return 'bg-red-100 border-red-300 text-red-600 cursor-not-allowed dark:bg-red-900 dark:border-red-700 dark:text-red-300';
    };

    return (
        <button
            onClick={onClick}
            disabled={!isAvailable}
            className={`p-3 rounded-lg border-2 text-center transition-all disabled:cursor-not-allowed ${getClasses()}`}
        >
            <div className="font-medium">{seat}</div>
            <div className="text-xs mt-1">
                {isAvailable ? (isSelected ? '선택됨' : '가능') : '불가'}
            </div>
        </button>
    );
};

export default SeatButton;