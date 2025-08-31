import React from 'react';

interface SpinnerProps {
    colorClass?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ colorClass }) => {
    return (
        <div className={`animate-spin rounded-full h-5 w-5 border-b-2 ${colorClass || 'border-current'}`}></div>
    );
};

export default Spinner;