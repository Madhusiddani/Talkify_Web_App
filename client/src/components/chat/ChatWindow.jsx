import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import Avatar from '../common/Avatar';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import styles from './ChatWindow.module.css';

const ChatWindow = ({ conversationId }) => {
    const { user } = useAuth();
    const { socket } = useSocket();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [targetUser, setTargetUser] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchMessages = async () => {
        try {
            const { data } = await api.get(`/messages/conversations/${conversationId}/messages`);
            setMessages(data.messages);

            // Temporary: Find the other user from existing messages or participants
            // In a real app, the conversation endpoint should return the partner details directly
            const partner = data.messages.find(m => m.sender.id !== user.id)?.sender;
            if (partner) setTargetUser(partner);

        } catch (err) {
            console.error('Failed to fetch messages:', err);
        } finally {
            setLoading(false);
            setTimeout(scrollToBottom, 100);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, [conversationId]);

    useEffect(() => {
        if (!socket) return;

        socket.on('message:new', (message) => {
            if (message.conversationId === conversationId) {
                setMessages((prev) => [...prev, message]);
                setTimeout(scrollToBottom, 100);

                // Send read receipt if this window is open
                if (message.sender.id !== user.id) {
                    socket.emit('message:read', {
                        conversationId,
                        messageId: message.id,
                        senderId: message.sender.id
                    });
                }
            }
        });

        socket.on('typing:start', (data) => {
            if (data.conversationId === conversationId) {
                setIsTyping(true);
            }
        });

        socket.on('typing:stop', (data) => {
            if (data.conversationId === conversationId) {
                setIsTyping(false);
            }
        });

        return () => {
            socket.off('message:new');
            socket.off('typing:start');
            socket.off('typing:stop');
        };
    }, [socket, conversationId, user.id]);

    if (loading) return <div className={styles.loading}>Loading conversation...</div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.targetInfo}>
                    <Avatar user={targetUser} size="md" showStatus={true} />
                    <div className={styles.nameSection}>
                        <span className={styles.name}>{targetUser?.username || 'Chat'}</span>
                        <span className={styles.subtext}>
                            {isTyping ? 'Typing...' : (targetUser?.isOnline ? 'Active now' : 'Offline')}
                        </span>
                    </div>
                </div>
            </header>

            <div className={styles.messageList}>
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} isMe={msg.sender.id === user.id} />
                ))}
                <div ref={messagesEndRef} />
            </div>

            <MessageInput
                conversationId={conversationId}
                recipientId={targetUser?.id}
            />
        </div>
    );
};

export default ChatWindow;
