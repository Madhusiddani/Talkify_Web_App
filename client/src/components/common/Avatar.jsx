import React from 'react';
import styles from './Avatar.module.css';

const Avatar = ({ user, size = 'md', showStatus = false }) => {
    const { username, avatar, isOnline } = user || {};
    const initials = username ? username.substring(0, 2).toUpperCase() : '?';

    return (
        <div className={`${styles.avatarContainer} ${styles[size]}`}>
            {avatar ? (
                <img src={avatar} alt={username} className={styles.avatarImg} />
            ) : (
                <div className={styles.avatarPlaceholder}>{initials}</div>
            )}
            {showStatus && (
                <div className={`${styles.statusDot} ${isOnline ? styles.online : styles.offline}`} />
            )}
        </div>
    );
};

export default Avatar;
