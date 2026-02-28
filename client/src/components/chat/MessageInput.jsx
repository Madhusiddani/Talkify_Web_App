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
            conversationId,
            text: text.trim(),
        }, (response) => {
            if (response.success) {
                setText('');
                // Stop typing indicator immediately
                socket.emit('typing:stop', { conversationId, recipientId });
            }
        });
    };

    const handleTyping = (e) => {
        setText(e.target.value);

        if (!socket || !recipientId) return;

        // Emit typing:start
        socket.emit('typing:start', { conversationId, recipientId });

        // Clear existing timer
        if (typingTimer.current) clearTimeout(typingTimer.current);

        // Set timer to emit typing:stop
        typingTimer.current = setTimeout(() => {
            socket.emit('typing:stop', { conversationId, recipientId });
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
