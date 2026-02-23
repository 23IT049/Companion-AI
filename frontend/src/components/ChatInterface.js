import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, LogOut, Menu } from 'lucide-react';
import './ChatInterface.css';
import MessageBubble from './MessageBubble';
import DeviceSelector from './DeviceSelector';
import TypingIndicator from './TypingIndicator';
import Sidebar from './Sidebar';
import { chatAPI } from '../services/api';

const SUGGESTED_QUESTIONS = [
    "My refrigerator is not cooling properly",
    "Washing machine won't drain water",
    "Air conditioner is making strange noises",
    "TV screen is flickering",
    "Dishwasher not cleaning dishes well",
];

const ChatInterface = ({ onLogout }) => {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [deviceType, setDeviceType] = useState('');
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLoadingConversation, setIsLoadingConversation] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleNewChat = () => {
        setConversationId(null);
        setMessages([]);
        setDeviceType('');
        setBrand('');
        setModel('');
        if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
        }
    };

    const handleSelectConversation = async (id) => {
        if (id === conversationId) {
            if (window.innerWidth < 1024) setIsSidebarOpen(false);
            return;
        }

        try {
            setIsLoadingConversation(true);
            setMessages([]); // clear immediately so empty state doesn't flash
            const data = await chatAPI.getConversation(id);

            if (!data || !data.conversation) {
                console.error('Unexpected API response:', data);
                return;
            }

            setConversationId(data.conversation.conversation_id);
            setDeviceType(data.conversation.device_type || '');
            setBrand(data.conversation.brand || '');
            setModel(data.conversation.model || '');

            const loadedMessages = (data.messages || []).map(msg => ({
                role: msg.role === 'user' || msg.role === 'assistant'
                    ? msg.role
                    : (String(msg.role).toLowerCase().includes('user') ? 'user' : 'assistant'),
                content: msg.content,
                sources: msg.sources || [],
                messageId: msg.message_id,
                timestamp: msg.created_at || new Date().toISOString()
            }));
            setMessages(loadedMessages);

            if (window.innerWidth < 1024) {
                setIsSidebarOpen(false);
            }
        } catch (error) {
            console.error('Error loading conversation:', error);
        } finally {
            setIsLoadingConversation(false);
        }
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const handleSendMessage = async (messageText) => {
        const text = messageText || inputValue.trim();
        if (!text || isLoading) return;

        // Add user message to UI
        const userMessage = {
            role: 'user',
            content: text,
            timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            // Send to API
            const response = await chatAPI.sendMessage(
                text,
                deviceType,
                brand,
                model,
                conversationId
            );

            // Update conversation ID if new
            if (!conversationId) {
                setConversationId(response.conversation_id);
            }

            // Add assistant message to UI
            const assistantMessage = {
                role: 'assistant',
                content: response.answer,
                sources: response.sources,
                messageId: response.message_id,
                timestamp: response.timestamp,
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Error sending message:', error);

            // Add error message
            const errorMessage = {
                role: 'assistant',
                content: 'Sorry, I encountered an error processing your request. Please try again.',
                isError: true,
                timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleSuggestedQuestion = (question) => {
        handleSendMessage(question);
    };

    return (
        <div className="chat-layout">
            <Sidebar
                currentConversationId={conversationId}
                onSelectConversation={handleSelectConversation}
                onNewChat={handleNewChat}
                isOpen={isSidebarOpen}
                toggleSidebar={toggleSidebar}
            />
            <div className="chat-interface">
                <div className="chat-header glass-effect">
                    <div className="header-actions-left">
                        <button className="menu-button" onClick={toggleSidebar}>
                            <Menu size={24} />
                        </button>
                        <div className="header-content">
                            <h1 className="gradient-text">Device Troubleshoot AI</h1>
                            <p className="header-subtitle">Get expert help with your device problems</p>
                        </div>
                    </div>
                    <DeviceSelector
                        deviceType={deviceType}
                        brand={brand}
                        model={model}
                        onDeviceTypeChange={setDeviceType}
                        onBrandChange={setBrand}
                        onModelChange={setModel}
                    />
                    {onLogout && (
                        <button className="logout-button" onClick={onLogout} title="Logout">
                            <LogOut size={20} />
                        </button>
                    )}
                </div>

                <div className="chat-messages">
                    {isLoadingConversation ? (
                        <div className="conv-loading">
                            <Loader2 className="icon-spin" size={32} />
                            <p>Loading conversation…</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="empty-state fade-in">
                            <div className="empty-state-icon">🔧</div>
                            <h2>How can I help you today?</h2>
                            <p>Ask me anything about troubleshooting your devices</p>

                            <div className="suggested-questions">
                                <p className="suggested-label">Try asking:</p>
                                {SUGGESTED_QUESTIONS.map((question, index) => (
                                    <button
                                        key={index}
                                        className="suggested-question hover-lift"
                                        onClick={() => handleSuggestedQuestion(question)}
                                    >
                                        {question}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((message, index) => (
                                <MessageBubble key={index} message={message} />
                            ))}
                            {isLoading && <TypingIndicator />}
                        </>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-container glass-effect">
                    <div className="chat-input-wrapper">
                        <textarea
                            className="chat-input"
                            placeholder="Describe your device problem..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            rows={1}
                            disabled={isLoading}
                        />
                        <button
                            className="send-button"
                            onClick={() => handleSendMessage()}
                            disabled={!inputValue.trim() || isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="icon-spin" size={20} />
                            ) : (
                                <Send size={20} />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatInterface;
