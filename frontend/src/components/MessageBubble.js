import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ThumbsUp, ThumbsDown, Copy, ChevronDown, ChevronUp, Check } from 'lucide-react';
import './MessageBubble.css';
import { feedbackAPI } from '../services/api';

const MessageBubble = ({ message }) => {
    const [expandedSources, setExpandedSources] = useState(false);
    const [copied, setCopied] = useState(false);
    const [feedbackGiven, setFeedbackGiven] = useState(null);

    const handleCopy = () => {
        navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleFeedback = async (rating) => {
        if (!message.messageId) return;

        try {
            await feedbackAPI.submitFeedback(message.messageId, rating);
            setFeedbackGiven(rating);
        } catch (error) {
            console.error('Error submitting feedback:', error);
        }
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

                    {message.messageId && (
                        <>
                            <button
                                className={`action-button ${feedbackGiven === 5 ? 'active' : ''}`}
                                onClick={() => handleFeedback(5)}
                                title="Helpful"
                            >
                                <ThumbsUp size={16} />
                            </button>
                            <button
                                className={`action-button ${feedbackGiven === 1 ? 'active' : ''}`}
                                onClick={() => handleFeedback(1)}
                                title="Not helpful"
                            >
                                <ThumbsDown size={16} />
                            </button>
                        </>
                    )}
                </div>
            )}

            {message.sources && message.sources.length > 0 && (
                <div className="sources-section">
                    <button
                        className="sources-toggle"
                        onClick={() => setExpandedSources(!expandedSources)}
                    >
                        <span>📚 {message.sources.length} Source{message.sources.length > 1 ? 's' : ''}</span>
                        {expandedSources ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {expandedSources && (
                        <div className="sources-list">
                            {message.sources.map((source, index) => (
                                <div key={index} className="source-item">
                                    <div className="source-header">
                                        <span className="source-file">{source.source_file}</span>
                                        {source.page_number && (
                                            <span className="source-page">Page {source.page_number}</span>
                                        )}
                                        <span className="source-score">
                                            {Math.round(source.relevance_score * 100)}% match
                                        </span>
                                    </div>
                                    <p className="source-content">{source.content}</p>
                                    {source.section_name && (
                                        <span className="source-section">Section: {source.section_name}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="message-timestamp">
                {new Date(message.timestamp).toLocaleTimeString()}
            </div>
        </div>
    );
};

export default MessageBubble;
