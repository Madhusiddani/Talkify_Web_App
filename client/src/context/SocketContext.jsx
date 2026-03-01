import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);

    useEffect(() => {
        if (user) {
            const token = localStorage.getItem('token');
            const newSocket = io({   // No URL = connects to same origin, goes through Vite proxy
                auth: { token },
                transports: ['websocket', 'polling'], // include polling as fallback
            });

            setSocket(newSocket);

            newSocket.on('connect', () => {
                console.log('Connected to socket server');
            });

            newSocket.on('connect_error', (err) => {
                console.error('Socket connection error:', err.message);
            });

            newSocket.on('user:status', ({ userId, isOnline }) => {
                setOnlineUsers((prev) => {
                    if (isOnline) {
                        return [...new Set([...prev, userId])];
                    } else {
                        return prev.filter((id) => id !== userId);
                    }
                });
            });

            return () => {
                newSocket.close();
                setSocket(null);
            };
        } else {
            setSocket(null);
        }
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket, onlineUsers }}>
            {children}
        </SocketContext.Provider>
    );
};
