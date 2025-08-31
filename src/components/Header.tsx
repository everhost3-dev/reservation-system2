import React from 'react';
import { View } from '../types';

interface HeaderProps {
    setView: (view: View) => void;
    setShowCancelForm: (show: boolean) => void;
    showCancelForm: boolean;
    darkMode: boolean;
    setDarkMode: (dark: boolean) => void;
    onShare: () => void;
}

const Header: React.FC<HeaderProps> = ({ setView, setShowCancelForm, showCancelForm, darkMode, setDarkMode, onShare }) => {
    
    const handleShare = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href).then(() => {
                onShare();
            }).catch(err => {
                console.error('Could not copy link: ', err);
                alert('링크 복사에 실패했습니다.');
            });
        } else {
             alert('클립보드 기능이 지원되지 않는 브라우저입니다.');
        }
    };

    return (
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold">🪑 자기주도학습실 예약</h1>
            <div className="flex gap-2">
                <button
                    onClick={() => setView(View.CheckinLogin)}
                    className="p-2 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="체크인/체크아웃"
                >
                    ✅
                </button>
                <button
                    onClick={() => setShowCancelForm(!showCancelForm)}
                    className="p-2 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="예약 취소"
                >
                    🗑️
                </button>
                <button
                    onClick={handleShare}
                    className="p-2 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="공유 링크 복사"
                >
                    🔗
                </button>
                <button
                    onClick={() => setView(View.AdminLogin)}
                    className="p-2 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="관리자"
                >
                    ⚙️
                </button>
                <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="p-2 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="테마 변경"
                >
                    {darkMode ? '☀️' : '🌙'}
                </button>
            </div>
        </div>
    );
};

export default Header;