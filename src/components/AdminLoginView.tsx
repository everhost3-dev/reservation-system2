import React, { useState } from 'react';

interface AdminLoginViewProps {
    onLogin: (password: string) => boolean;
    onExit: () => void;
}

const AdminLoginView: React.FC<AdminLoginViewProps> = ({ onLogin, onExit }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = () => {
        if (!onLogin(password)) {
            setError('비밀번호가 올바르지 않습니다.');
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-md">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold">🔐 관리자 로그인</h1>
                <button onClick={onExit} className="p-2 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    ❌
                </button>
            </div>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-2">관리자 비밀번호</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="비밀번호를 입력하세요"
                        className="w-full p-3 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button
                    onClick={handleLogin}
                    className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                    🔓 로그인
                </button>
            </div>
        </div>
    );
};

export default AdminLoginView;