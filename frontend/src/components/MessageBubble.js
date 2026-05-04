import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check } from 'lucide-react';
import './MessageBubble.css';

const MessageBubble = ({ message }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isUser = message.role === 'user';
    const hasError = message.isError;

    return (
        <div className={`message-bubble ${isUser ? 'user-message' : 'assistant-message'} fade-in`}>
            <div className={`message-content ${hasError ? 'error-message' : ''}`}>
                {isUser ? (
                    <p>{message.content}</p>
                ) : (
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                )}
            </div>

            {!isUser && !hasError && (
                <div className="message-actions">
                    <button
                        className="action-button"
                        onClick={handleCopy}
                        title="Copy to clipboard"
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>


                </div>
            )}



            <div className="message-timestamp">
                {new Date(
                    // Server sends UTC timestamps without 'Z' suffix — append it so
                    // the browser correctly converts UTC → local time for display.
                    typeof message.timestamp === 'string' && !message.timestamp.endsWith('Z') && !message.timestamp.includes('+')
                        ? message.timestamp + 'Z'
                        : message.timestamp
                ).toLocaleTimeString()}
            </div>
        </div>
    );
};

export default MessageBubble;
