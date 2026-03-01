import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '../common/Avatar';
import styles from './ConversationItem.module.css';

const ConversationItem = ({ conversation, isActive, onClick }) => {
    const otherParticipant = conversation.partner;  // server returns 'partner' directly
    const lastMessage = conversation.lastMessage;

    return (
        <div
            className={`${styles.item} ${isActive ? styles.active : ''}`}
            onClick={onClick}
        >
            <Avatar user={otherParticipant} size="md" showStatus={true} />

            <div className={styles.content}>
                <div className={styles.topLine}>
                    <span className={styles.username}>{otherParticipant?.username}</span>
                    {lastMessage && (
                        <span className={styles.time}>
                            {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: false })}
                        </span>
                    )}
                </div>

                <div className={styles.bottomLine}>
                    <p className={styles.preview}>
                        {lastMessage ? (lastMessage.displayContent || lastMessage.content) : 'Start a conversation'}
                    </p>
                    {conversation.unreadCount > 0 && (
                        <span className={styles.badge}>{conversation.unreadCount}</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConversationItem;
