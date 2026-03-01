import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import styles from './MessageInput.module.css';

const MessageInput = ({ conversationId, recipientId }) => {
    const [text, setText] = useState('');
    const { socket } = useSocket();
    const typingTimer = useRef(null);

    const handleSend = (e) => {
        e.preventDefault();
        if (!text.trim() || !socket) return;

        socket.emit('message:send', {
            receiverId: recipientId,   // server expects receiverId, not conversationId
            content: text.trim(),      // server expects 'content', not 'text'
        });

        setText('');
        socket.emit('typing:stop', { receiverId: recipientId });
    };

    const handleTyping = (e) => {
        setText(e.target.value);

        if (!socket || !recipientId) return;

        socket.emit('typing:start', { receiverId: recipientId });

        if (typingTimer.current) clearTimeout(typingTimer.current);

        typingTimer.current = setTimeout(() => {
            socket.emit('typing:stop', { receiverId: recipientId });
        }, 2000);
    };

    return (
        <form className={styles.inputArea} onSubmit={handleSend}>
            <input
                type="text"
                placeholder="Write a message..."
                className={styles.input}
                value={text}
                onChange={handleTyping}
            />
            <button
                type="submit"
                className={styles.sendBtn}
                disabled={!text.trim()}
            >
                <span>➤</span>
            </button>
        </form>
    );
};

export default MessageInput;
