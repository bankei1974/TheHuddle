import React, { useState } from 'react';
import { useAuthContext } from '../context/AuthContext';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, error } = useAuthContext();

    const handleSubmit = (e) => {
        e.preventDefault();
        login(email, password);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <img src="https://firebasestorage.googleapis.com/v0/b/gemini-app-2-97a7d.firebasestorage.app/o/Gemini_Generated_Image_a0oe30a0oe30a0oe%20(1).png?alt=media&token=4967f007-3f9c-4b3d-a1d4-b1cf21a20a88" alt="Logo" className="w-48 h-48 mx-auto mb-4" />
                    <p className="text-gray-400 mt-2">Sign in to access your schedule</p>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="email" className="label-style">Email Address</label>
                                <input id="email" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-style login-input" style={{ color: 'black' }} placeholder="manager@hospital.com" />
                            </div>
                            <div>
                                <label htmlFor="password" className="label-style">Password</label>
                                <input id="password" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-style login-input" style={{ color: 'black' }} placeholder="••••••••" />
                            </div>
                        </div>
                        {error && <p className="mt-4 text-center text-red-400 text-sm">{error}</p>}
                        <div className="mt-8">
                            <button type="submit" className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold">Sign In</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;