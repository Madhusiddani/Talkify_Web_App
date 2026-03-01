import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const { data } = await api.get('/auth/me');
                setUser(data);  // /auth/me returns user directly, not wrapped in { user }
            } catch (err) {
                localStorage.removeItem('token');
                setError(err.response?.data?.message || 'Authentication failed');
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    const login = async (email, password) => {
        setError(null);
        try {
            const { data } = await api.post('/auth/login', { email, password });
            setUser(data.user);
            localStorage.setItem('token', data.token);
            return { success: true };
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
            return { success: false, message: err.response?.data?.message || 'Login failed' };
        }
    };

    const register = async (username, email, password, preferredLanguage) => {
        setError(null);
        try {
            const { data } = await api.post('/auth/register', {
                username,
                email,
                password,
                preferredLang: preferredLanguage,  // Prisma schema field is preferredLang
            });
            setUser(data.user);
            localStorage.setItem('token', data.token);
            return { success: true };
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
            return { success: false, message: err.response?.data?.message || 'Registration failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const updateLanguage = async (newLang) => {
        try {
            const { data } = await api.patch('/auth/language', { preferredLanguage: newLang });
            setUser(data.user);
            return { success: true };
        } catch (err) {
            return { success: false, message: 'Failed to update language' };
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, error, login, register, logout, updateLanguage }}>
            {children}
        </AuthContext.Provider>
    );
};
