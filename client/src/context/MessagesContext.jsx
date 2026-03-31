import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const MessagesContext = createContext(null);

export const convKey = (a, b) => [a, b].sort().join('::');

/* ─── helpers ─────────────────────────────────────────────────────────────── */
// Use relative paths — Vite proxy injects x-app-token and forwards to :4000
const apiFetch = async (path, opts = {}) => {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
};

export const MessagesProvider = ({ children }) => {
  // conversations: [ { key, otherUser, lastMsg } ]
  const [conversations, setConversations] = useState([]);
  // threads cache: { convKey: [ msg, … ] }
  const [threads, setThreads] = useState({});
  // unread summary: [ { fromUser, count, lastMsg } ]
  const [unreadSummary, setUnreadSummary] = useState([]);
  const [totalUnread, setTotalUnread] = useState(0);

  const currentUserRef = useRef(null);
  const pollRef = useRef(null);

  const getMe = () => {
    try { return JSON.parse(sessionStorage.getItem('currentUser')); }
    catch { return null; }
  };

  /* ── Fetch conversation list ── */
  const fetchConversations = useCallback(async (user) => {
    if (!user) return;
    try {
      const data = await apiFetch(`/api/messages/conversations?user=${encodeURIComponent(user)}`);
      setConversations(data.conversations || []);
    } catch { /* offline – keep stale */ }
  }, []);

  /* ── Fetch unread summary ── */
  const fetchUnread = useCallback(async (user) => {
    if (!user) return;
    try {
      const data = await apiFetch(`/api/messages/unread?user=${encodeURIComponent(user)}`);
      setUnreadSummary(data.unread || []);
      setTotalUnread(data.total || 0);
    } catch { /* offline */ }
  }, []);

  /* ── Fetch a single thread ── */
  const fetchThread = useCallback(async (userA, userB) => {
    try {
      const data = await apiFetch(`/api/messages?user=${encodeURIComponent(userA)}&other=${encodeURIComponent(userB)}`);
      const key = convKey(userA, userB);
      setThreads(prev => ({ ...prev, [key]: data.messages || [] }));
      return data.messages || [];
    } catch {
      return [];
    }
  }, []);

  /* ── Poll every 4 seconds for new messages ── */
  const startPolling = useCallback((user) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      fetchConversations(user);
      fetchUnread(user);
    }, 4000);
  }, [fetchConversations, fetchUnread]);

  /* ── Boot / auth changes ── */
  useEffect(() => {
    const boot = () => {
      const me = getMe();
      if (!me?.profileName) return;
      const name = me.profileName;
      currentUserRef.current = name;
      fetchConversations(name);
      fetchUnread(name);
      startPolling(name);
    };

    boot();
    window.addEventListener('authchange', boot);
    return () => {
      window.removeEventListener('authchange', boot);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchConversations, fetchUnread, startPolling]);

  /* ── Send a message ── */
  const sendMessage = useCallback(async (fromUser, toUser, text) => {
    if (!text.trim()) return null;
    try {
      const data = await apiFetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ from: fromUser, to: toUser, text: text.trim() }),
      });
      const msg = data.message;
      const key = convKey(fromUser, toUser);
      // Update local thread cache immediately
      setThreads(prev => ({ ...prev, [key]: [...(prev[key] || []), msg] }));
      // Refresh conversation list
      fetchConversations(fromUser);
      return msg;
    } catch (err) {
      console.error('sendMessage failed:', err);
      return null;
    }
  }, [fetchConversations]);

  /* ── Mark conversation read ── */
  const markRead = useCallback(async (byUser, fromUser) => {
    try {
      await apiFetch('/api/messages/read', {
        method: 'POST',
        body: JSON.stringify({ byUser, fromUser }),
      });
      // Immediately remove from local unread
      setUnreadSummary(prev => prev.filter(x => x.fromUser !== fromUser));
      setTotalUnread(prev => {
        const removed = unreadSummary.find(x => x.fromUser === fromUser);
        return Math.max(0, prev - (removed?.count || 0));
      });
    } catch { /* ignore */ }
  }, [unreadSummary]);

  /* ── Get cached thread (call fetchThread to hydrate) ── */
  const getThread = useCallback((userA, userB) => {
    const key = convKey(userA, userB);
    return threads[key] || [];
  }, [threads]);

  /* ── helpers kept for API compatibility ── */
  const getTotalUnread = useCallback(() => totalUnread, [totalUnread]);
  const getUnreadSummary = useCallback(() => unreadSummary, [unreadSummary]);
  const getConversationList = useCallback(() => conversations, [conversations]);

  return (
    <MessagesContext.Provider value={{
      conversations,
      threads,
      totalUnread,
      unreadSummary,
      sendMessage,
      markRead,
      fetchThread,
      getThread,
      getTotalUnread,
      getUnreadSummary,
      getConversationList,
      convKey,
    }}>
      {children}
    </MessagesContext.Provider>
  );
};

export const useMessages = () => {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error('useMessages must be used inside MessagesProvider');
  return ctx;
};
