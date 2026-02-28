import React, { useState } from 'react';
import styles from './MessageBubble.module.css';

const MessageBubble = ({ message, isMe }) => {
    const [showOriginal, setShowOriginal] = useState(false);

    return (
        <div className={`${styles.wrapper} ${isMe ? styles.me : styles.them}`}>
            <div className={styles.bubble}>
                <p className={styles.text}>
                    {showOriginal ? message.originalText : message.displayText}
                </p>

                {message.isTranslated && (
                    <div className={styles.translationInfo}>
                        <span className={styles.badge}>
                            Translated from {message.detectedLanguage.toUpperCase()}
                        </span>
                        <button
                            className={styles.toggleBtn}
                            onClick={() => setShowOriginal(!showOriginal)}
                        >
                            {showOriginal ? 'Show translation' : 'Show original'}
                        </button>
                    </div>
                )}
            </div>

            <div className={styles.meta}>
                <span className={styles.time}>
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {isMe && (
                    <span className={`${styles.status} ${message.status === 'READ' ? styles.read : ''}`}>
                        {message.status === 'READ' ? '✓✓' : '✓'}
                    </span>
                )}
            </div>
        </div>
    );
};

export default MessageBubble;
