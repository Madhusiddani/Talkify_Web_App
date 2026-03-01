import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';
import ConversationList from '../chat/ConversationList';
import UserSearchModal from '../chat/UserSearchModal';
import styles from './Sidebar.module.css';

const Sidebar = ({ onSelectConversation, activeConversationId }) => {
    const { user, logout, updateLanguage } = useAuth();
    const [showSearch, setShowSearch] = useState(false);

    const LANGUAGES = [
        { code: 'en', name: 'English' },
        { code: 'hi', name: 'Hindi' },
        { code: 'te', name: 'Telugu' },
        { code: 'ta', name: 'Tamil' },
        { code: 'bn', name: 'Bengali' },
        { code: 'gu', name: 'Gujarati' },
        { code: 'kn', name: 'Kannada' },
        { code: 'ml', name: 'Malayalam' },
        { code: 'mr', name: 'Marathi' },
        { code: 'pa', name: 'Punjabi' },
        { code: 'ur', name: 'Urdu' },
    ];

    return (
        <aside className={styles.sidebar}>
            <header className={styles.header}>
                <div className={styles.userProfile}>
                    <Avatar user={user} size="md" />
                    <div className={styles.userInfo}>
                        <span className={styles.username}>{user?.username}</span>
                        <span className={styles.status}>Online</span>
                    </div>
                </div>
                <button
                    className={styles.searchBtn}
                    onClick={() => setShowSearch(true)}
                    title="New Chat"
                >
                    <span className={styles.plusIcon}>+</span>
                </button>
            </header>

            <div className={styles.content}>
                <ConversationList
                    onSelect={onSelectConversation}
                    activeId={activeConversationId}
                />
            </div>

            <footer className={styles.footer}>
                <select
                    className={styles.langSelect}
                    value={user?.preferredLang}   // Prisma schema field is preferredLang, not preferredLanguage
                    onChange={(e) => updateLanguage(e.target.value)}
                >
                    {LANGUAGES.map(l => (
                        <option key={l.code} value={l.code}>{l.name}</option>
                    ))}
                </select>
                <button className={styles.logoutBtn} onClick={logout}>
                    Logout
                </button>
            </footer>

            {showSearch && (
                <UserSearchModal
                    onClose={() => setShowSearch(false)}
                    onSelectConversation={onSelectConversation}
                />
            )}
        </aside>
    );
};

export default Sidebar;
