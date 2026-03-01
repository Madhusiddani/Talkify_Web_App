import React, { useState } from 'react';
import styles from './MessageBubble.module.css';

// Human-readable language names
const LANG_NAMES = {
    en: 'English', hi: 'Hindi', te: 'Telugu', ta: 'Tamil',
    bn: 'Bengali', gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam',
    mr: 'Marathi', pa: 'Punjabi', ur: 'Urdu', fr: 'French',
    es: 'Spanish', de: 'German', ru: 'Russian', ja: 'Japanese',
    zh: 'Chinese', ko: 'Korean', ar: 'Arabic',
};

const MessageBubble = ({ message, isMe }) => {
    const [showOriginal, setShowOriginal] = useState(false);

    // A message is translated if displayContent exists and differs from the raw content
    const isTranslated = !isMe &&
        message.displayContent &&
        message.displayContent.trim() !== message.content.trim();

    const displayText = showOriginal
        ? message.content
        : (message.displayContent || message.content);

    const sourceLangName = LANG_NAMES[message.originalLang] || (message.originalLang?.toUpperCase() ?? 'Unknown');

    return (
        <div className={`${styles.wrapper} ${isMe ? styles.me : styles.them}`}>
            <div className={styles.bubble}>
                <p className={styles.text}>{displayText}</p>

                {isTranslated && (
                    <div className={styles.translationInfo}>
                        <span className={styles.badge}>
                            🌐 Translated from {sourceLangName}
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
                    {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </span>
                {isMe && (
                    <span className={styles.status}>✓</span>
                )}
            </div>
        </div>
    );
};

export default MessageBubble;
