import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Avatar from '../common/Avatar';
import styles from './UserSearchModal.module.css';

const UserSearchModal = ({ onClose, onSelectConversation }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const search = async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                const { data } = await api.get(`/users/search?q=${query}`);
                setResults(data.users);
            } catch (err) {
                console.error('Search failed:', err);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(search, 300);
        return () => clearTimeout(timer);
    }, [query]);

    const handleStartChat = async (userId) => {
        try {
            const { data } = await api.post('/messages/conversations/start', { recipientId: userId });
            onSelectConversation(data.conversation.id);
            onClose();
        } catch (err) {
            console.error('Failed to start chat:', err);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <header className={styles.header}>
                    <h3>New Chat</h3>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </header>

                <div className={styles.searchBox}>
                    <input
                        type="text"
                        placeholder="Search by username..."
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>

                <div className={styles.results}>
                    {loading ? (
                        <div className={styles.info}>Searching...</div>
                    ) : results.length > 0 ? (
                        results.map((user) => (
                            <div
                                key={user.id}
                                className={styles.userItem}
                                onClick={() => handleStartChat(user.id)}
                            >
                                <Avatar user={user} size="md" />
                                <span className={styles.username}>{user.username}</span>
                                <button className={styles.startBtn}>Chat</button>
                            </div>
                        ))
                    ) : query.length >= 2 ? (
                        <div className={styles.info}>No users found.</div>
                    ) : (
                        <div className={styles.info}>Type at least 2 characters to search.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserSearchModal;
