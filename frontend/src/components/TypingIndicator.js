import React from 'react';
import './TypingIndicator.css';

const TypingIndicator = () => {
    return (
        <div className="typing-indicator fade-in">
            <div className="typing-content">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
            </div>
        </div>
    );
};

export default TypingIndicator;
