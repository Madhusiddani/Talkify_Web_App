import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import ConversationItem from './ConversationItem';
import styles from './ConversationList.module.css';

const ConversationList = ({ onSelect, activeId }) => {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const { socket } = useSocket();

    const fetchConversations = async () => {
        try {
            const { data } = await api.get('/messages/conversations');
            setConversations(data.conversations);
        } catch (err) {
            console.error('Failed to fetch conversations:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, []);

    useEffect(() => {
        if (!socket) return;

        socket.on('message:new', (message) => {
            // Refresh conversation list to show latest message preview
            fetchConversations();
        });

        return () => {
            socket.off('message:new');
        };
    }, [socket]);

    if (loading) return (
        <div className={styles.loading}>Loading chats...</div>
    );

    return (
        <div className={styles.container}>
            {conversations.length === 0 ? (
                <div className={styles.empty}>No conversations yet. Start a new chat!</div>
            ) : (
                conversations.map((conv) => (
                    <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isActive={activeId === conv.id}
                        onClick={() => onSelect(conv.id)}
                    />
                ))
            )}
        </div>
    );
};

export default ConversationList;
