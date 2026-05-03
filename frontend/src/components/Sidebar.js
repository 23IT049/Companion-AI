import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, PanelLeft, LogOut, Settings } from 'lucide-react';
import { chatAPI } from '../services/api';
import UserProfileModal from './UserProfileModal';
import DeviceSelector from './DeviceSelector';
import './Sidebar.css';

const Sidebar = ({
    currentConversationId,
    onSelectConversation,
    onNewChat,
    isOpen,
    toggleSidebar,
    onLogout,
    deviceType,
    brand,
    model,
    onDeviceTypeChange,
    onBrandChange,
    onModelChange
}) => {
    const [conversations, setConversations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    const [userEmail, setUserEmail]   = useState(
        localStorage.getItem('user_email') || localStorage.getItem('email') || 'user@email.com'
    );
    const [avatarColor, setAvatarColor] = useState(null);
    const [fullName, setFullName]       = useState(localStorage.getItem('user_full_name') || '');

    const userInitial = (fullName || userEmail).charAt(0).toUpperCase();

    useEffect(() => {
        loadConversations();
    }, [currentConversationId]);

    const loadConversations = async () => {
        setIsLoading(true);
        try {
            const data = await chatAPI.listConversations(20, 0);
            if (Array.isArray(data)) {
                setConversations(data);
            } else if (data && data.items) {
                setConversations(data.items);
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getConvLabel = (conv) => {
        if (conv.title) return conv.title;
        if (conv.device_type) return `${conv.brand || ''} ${conv.device_type}`.trim();
        return new Date(conv.created_at || conv.updated_at).toLocaleDateString();
    };

    const handleProfileUpdate = (updated) => {
        if (updated.email)       setUserEmail(updated.email);
        if (updated.full_name !== undefined) {
            setFullName(updated.full_name || '');
            if (updated.full_name) localStorage.setItem('user_full_name', updated.full_name);
        }
        if (updated.avatar_color) setAvatarColor(updated.avatar_color);
    };

    const avatarStyle = avatarColor
        ? { background: avatarColor }
        : {};

    return (
        <>
            {/* Mobile backdrop */}
            <div className={`sidebar-overlay ${isOpen ? 'show' : ''}`} onClick={toggleSidebar} />

            <div className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''} glass-effect`}>

                {/* ── Header ── */}
                <div className={`sidebar-header ${isCollapsed ? 'collapsed-header' : ''}`}>
                    {isCollapsed ? (
                        <>
                            <button className="sidebar-toggle-btn" onClick={() => setIsCollapsed(c => !c)} title="Expand sidebar">
                                <PanelLeft size={20} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="new-chat-button" onClick={onNewChat}>
                                <Plus size={18} />
                                <span>New Chat</span>
                            </button>
                            <button className="sidebar-toggle-btn" onClick={() => setIsCollapsed(c => !c)} title="Collapse sidebar">
                                <PanelLeft size={20} />
                            </button>
                        </>
                    )}
                </div>

                {/* ── Fixed Device Selector ── */}
                {!isCollapsed && (
                    <div className="sidebar-device-selector">
                        <DeviceSelector
                            deviceType={deviceType}
                            brand={brand}
                            model={model}
                            onDeviceTypeChange={onDeviceTypeChange}
                            onBrandChange={onBrandChange}
                            onModelChange={onModelChange}
                        />
                    </div>
                )}

                {/* ── Fixed Recent Chats Title ── */}
                {!isCollapsed && (
                    <div className="sidebar-title-container">
                        <p className="sidebar-title">Recent Chats</p>
                    </div>
                )}

                {/* ── Body ── */}
                <div className="sidebar-content">

                    {isLoading ? (
                        <div className="sidebar-loading">{isCollapsed ? '…' : 'Loading...'}</div>
                    ) : conversations.length === 0 ? (
                        <div className="sidebar-empty">
                            {!isCollapsed && 'No recent conversations'}
                        </div>
                    ) : (
                        <ul className="conversation-list">
                            {conversations.map((conv) => (
                                <li key={conv.conversation_id}>
                                    <button
                                        className={`conversation-item ${currentConversationId === conv.conversation_id ? 'active' : ''} ${isCollapsed ? 'icon-only' : ''}`}
                                        onClick={() => onSelectConversation(conv.conversation_id)}
                                        title={getConvLabel(conv)}
                                    >
                                        <MessageSquare size={18} className="conv-icon" />
                                        {!isCollapsed && (
                                            <span className="conversation-title">
                                                {getConvLabel(conv)}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* ── Profile Footer ── */}
                <div className={`sidebar-profile ${isCollapsed ? 'collapsed' : ''}`}>
                    {/* Clicking the avatar / name opens the profile modal */}
                    <button
                        className="profile-identity-btn"
                        onClick={() => setProfileOpen(true)}
                        title="Edit profile"
                    >
                        <div className="profile-avatar" style={avatarStyle}>{userInitial}</div>
                        {!isCollapsed && (
                            <div className="profile-info">
                                {fullName && <span className="profile-name">{fullName}</span>}
                                <span className="profile-email" title={userEmail}>{userEmail}</span>
                            </div>
                        )}
                    </button>

                    {!isCollapsed && (
                        <button
                            className="profile-settings-btn"
                            onClick={() => setProfileOpen(true)}
                            title="Account settings"
                        >
                            <Settings size={15} />
                        </button>
                    )}

                    {onLogout && (
                        <button
                            className="profile-logout-btn"
                            onClick={onLogout}
                            title="Logout"
                        >
                            <LogOut size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Profile modal */}
            <UserProfileModal
                isOpen={profileOpen}
                onClose={() => setProfileOpen(false)}
                onProfileUpdate={handleProfileUpdate}
                onLogout={onLogout}
            />
        </>
    );
};

export default Sidebar;
