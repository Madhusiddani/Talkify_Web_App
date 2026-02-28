import React, { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import styles from './ChatPage.module.css';

const ChatPage = () => {
    const [activeConversationId, setActiveConversationId] = useState(null);

    const handleSelectConversation = (id) => {
        setActiveConversationId(id);
    };

    return (
        <div className={styles.chatPage}>
            <Sidebar
                onSelectConversation={handleSelectConversation}
                activeConversationId={activeConversationId}
            />
            <main className={styles.mainContent}>
                {activeConversationId ? (
                    <ChatWindow conversationId={activeConversationId} />
                ) : (
                    <div className={styles.welcomeScreen}>
                        <div className={styles.welcomeIcon}>💬</div>
                        <h2>Welcome to Talkify</h2>
                        <p>Select a conversation to start chatting with real-time translation.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ChatPage;
