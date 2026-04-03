import React, { useState, useEffect, useRef } from 'react';
import { X, User, Lock, Trash2, Save, Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { authAPI } from '../services/api';
import './UserProfileModal.css';

const AVATAR_COLORS = [
    '#0ea5e9', '#8b5cf6', '#ec4899', '#f97316',
    '#10b981', '#f59e0b', '#ef4444', '#06b6d4',
];

const UserProfileModal = ({ isOpen, onClose, onProfileUpdate, onLogout }) => {
    const [tab, setTab] = useState('profile');

    // Profile state
    const [profile, setProfile]       = useState(null);
    const [fullName, setFullName]     = useState('');
    const [bio, setBio]               = useState('');
    const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileMsg, setProfileMsg] = useState(null); // {type:'success'|'error', text}

    // Password state
    const [currentPw, setCurrentPw]   = useState('');
    const [newPw, setNewPw]           = useState('');
    const [confirmPw, setConfirmPw]   = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew]         = useState(false);
    const [pwLoading, setPwLoading]   = useState(false);
    const [pwMsg, setPwMsg]           = useState(null);

    // Delete state
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteMsg, setDeleteMsg]   = useState(null);

    const modalRef = useRef(null);

    // ── Load profile when modal opens ──────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        setTab('profile');
        setProfileMsg(null);
        setPwMsg(null);
        setDeleteMsg(null);
        setDeleteConfirm('');

        const load = async () => {
            try {
                const data = await authAPI.getProfile();
                setProfile(data);
                setFullName(data.full_name || '');
                setBio(data.bio || '');
                setAvatarColor(data.avatar_color || AVATAR_COLORS[0]);
                // Sync email to localStorage
                if (data.email) localStorage.setItem('user_email', data.email);
            } catch {
                setProfileMsg({ type: 'error', text: 'Failed to load profile.' });
            }
        };
        load();
    }, [isOpen]);

    // ── Close on backdrop click ────────────────────────────────────────────
    const handleBackdrop = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };

    // ── Save profile ───────────────────────────────────────────────────────
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        setProfileMsg(null);
        try {
            const updated = await authAPI.updateProfile({
                full_name: fullName || null,
                bio: bio || null,
                avatar_color: avatarColor,
            });
            setProfile(updated);
            if (updated.full_name) localStorage.setItem('user_full_name', updated.full_name);
            setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
            if (onProfileUpdate) onProfileUpdate(updated);
        } catch (err) {
            setProfileMsg({ type: 'error', text: err.response?.data?.detail || 'Update failed.' });
        } finally {
            setProfileLoading(false);
        }
    };

    // ── Change password ────────────────────────────────────────────────────
    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPwMsg(null);
        if (newPw !== confirmPw) {
            setPwMsg({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        if (newPw.length < 8) {
            setPwMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
            return;
        }
        setPwLoading(true);
        try {
            await authAPI.changePassword(currentPw, newPw);
            setPwMsg({ type: 'success', text: 'Password changed successfully!' });
            setCurrentPw(''); setNewPw(''); setConfirmPw('');
        } catch (err) {
            setPwMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to change password.' });
        } finally {
            setPwLoading(false);
        }
    };

    // ── Delete account ─────────────────────────────────────────────────────
    const handleDeleteAccount = async () => {
        if (deleteConfirm !== 'DELETE') {
            setDeleteMsg({ type: 'error', text: 'Type DELETE to confirm.' });
            return;
        }
        setDeleteLoading(true);
        setDeleteMsg(null);
        try {
            await authAPI.deleteAccount();
            authAPI.logout();
            if (onLogout) onLogout();
        } catch (err) {
            setDeleteMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to delete account.' });
            setDeleteLoading(false);
        }
    };

    if (!isOpen) return null;

    const userEmail  = profile?.email || localStorage.getItem('user_email') || 'user@email.com';
    const userInitial = (fullName || userEmail).charAt(0).toUpperCase();

    return (
        <div className="upm-overlay" onClick={handleBackdrop}>
            <div className="upm-modal glass-effect" ref={modalRef}>
                {/* Header */}
                <div className="upm-header">
                    <h2 className="upm-title">Account Settings</h2>
                    <button className="upm-close" onClick={onClose} title="Close"><X size={20} /></button>
                </div>

                {/* Avatar preview */}
                <div className="upm-avatar-row">
                    <div className="upm-avatar" style={{ background: avatarColor }}>
                        {userInitial}
                    </div>
                    <div className="upm-avatar-info">
                        <p className="upm-display-name">{fullName || userEmail}</p>
                        <p className="upm-email">{userEmail}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="upm-tabs">
                    <button
                        className={`upm-tab ${tab === 'profile' ? 'active' : ''}`}
                        onClick={() => { setTab('profile'); setProfileMsg(null); }}
                    >
                        <User size={15} /> Profile
                    </button>
                    <button
                        className={`upm-tab ${tab === 'security' ? 'active' : ''}`}
                        onClick={() => { setTab('security'); setPwMsg(null); setDeleteMsg(null); }}
                    >
                        <Lock size={15} /> Security
                    </button>
                </div>

                {/* ── Profile Tab ── */}
                {tab === 'profile' && (
                    <form className="upm-form" onSubmit={handleSaveProfile}>
                        <div className="upm-field">
                            <label>Full Name</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                placeholder="Your display name"
                                maxLength={100}
                            />
                        </div>

                        <div className="upm-field">
                            <label>Bio</label>
                            <textarea
                                value={bio}
                                onChange={e => setBio(e.target.value)}
                                placeholder="Tell us a bit about yourself…"
                                maxLength={300}
                                rows={3}
                            />
                            <span className="upm-char-count">{bio.length}/300</span>
                        </div>

                        <div className="upm-field">
                            <label>Avatar Color</label>
                            <div className="upm-color-palette">
                                {AVATAR_COLORS.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        className={`upm-color-swatch ${avatarColor === c ? 'selected' : ''}`}
                                        style={{ background: c }}
                                        onClick={() => setAvatarColor(c)}
                                        title={c}
                                    />
                                ))}
                            </div>
                        </div>

                        {profileMsg && (
                            <div className={`upm-msg ${profileMsg.type}`}>
                                {profileMsg.type === 'success' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                                {profileMsg.text}
                            </div>
                        )}

                        <button type="submit" className="upm-btn-primary" disabled={profileLoading}>
                            <Save size={16} />
                            {profileLoading ? 'Saving…' : 'Save Changes'}
                        </button>
                    </form>
                )}

                {/* ── Security Tab ── */}
                {tab === 'security' && (
                    <div className="upm-form">
                        {/* Change Password */}
                        <p className="upm-section-label">Change Password</p>

                        <div className="upm-field">
                            <label>Current Password</label>
                            <div className="upm-pw-wrap">
                                <input
                                    type={showCurrent ? 'text' : 'password'}
                                    value={currentPw}
                                    onChange={e => setCurrentPw(e.target.value)}
                                    placeholder="••••••••"
                                />
                                <button type="button" className="upm-eye" onClick={() => setShowCurrent(v => !v)}>
                                    {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        <div className="upm-field">
                            <label>New Password</label>
                            <div className="upm-pw-wrap">
                                <input
                                    type={showNew ? 'text' : 'password'}
                                    value={newPw}
                                    onChange={e => setNewPw(e.target.value)}
                                    placeholder="Min 8 characters"
                                />
                                <button type="button" className="upm-eye" onClick={() => setShowNew(v => !v)}>
                                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        <div className="upm-field">
                            <label>Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPw}
                                onChange={e => setConfirmPw(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>

                        {pwMsg && (
                            <div className={`upm-msg ${pwMsg.type}`}>
                                {pwMsg.type === 'success' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                                {pwMsg.text}
                            </div>
                        )}

                        <button
                            type="button"
                            className="upm-btn-primary"
                            disabled={pwLoading || !currentPw || !newPw || !confirmPw}
                            onClick={handleChangePassword}
                        >
                            <Lock size={16} />
                            {pwLoading ? 'Updating…' : 'Update Password'}
                        </button>

                        {/* Danger Zone */}
                        <div className="upm-danger-zone">
                            <p className="upm-section-label danger">⚠ Delete Account</p>
                            <p className="upm-danger-desc">
                                Permanently delete your account and all your data. This action cannot be undone.
                            </p>
                            <input
                                type="text"
                                className="upm-danger-input"
                                value={deleteConfirm}
                                onChange={e => setDeleteConfirm(e.target.value)}
                                placeholder='Type DELETE to confirm'
                            />
                            {deleteMsg && (
                                <div className={`upm-msg ${deleteMsg.type}`}>
                                    <AlertTriangle size={15} /> {deleteMsg.text}
                                </div>
                            )}
                            <button
                                type="button"
                                className="upm-btn-danger"
                                onClick={handleDeleteAccount}
                                disabled={deleteLoading || deleteConfirm !== 'DELETE'}
                            >
                                <Trash2 size={16} />
                                {deleteLoading ? 'Deleting…' : 'Delete My Account'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserProfileModal;
