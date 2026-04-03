import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { apiFetch, getAuthToken } from '../utils/api';
import { useAuth } from './AuthContext';

const MessagesContext = createContext(null);

export const convKey = (a, b) => [a, b].sort().join('::');

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const apiFetchJson = async (path, opts = {}) => {
  const res = await apiFetch(path, opts);
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
  const socketRef = useRef(null);
  const { user } = useAuth();

  /* ── Fetch conversation list ── */
  // Server uses JWT (req.user.userId) — no ?user= param needed
  const fetchConversations = useCallback(async () => {
    if (!user?.username) return;
    try {
      const data = await apiFetchJson('/api/messages/conversations');
      setConversations(data.conversations || []);
    } catch { /* offline – keep stale */ }
  }, [user?.username]);

  /* ── Fetch unread summary ── */
  // Server uses JWT — no ?user= param needed
  const fetchUnread = useCallback(async () => {
    if (!user?.username) return;
    try {
      const data = await apiFetchJson('/api/messages/unread');
      setUnreadSummary(data.unread || []);
      setTotalUnread(data.total || 0);
    } catch { /* offline */ }
  }, [user?.username]);

  /* ── Fetch a single thread ── */
  // Server only needs ?other= (uses JWT for current user)
  const fetchThread = useCallback(async (userA, userB) => {
    try {
      const data = await apiFetchJson(`/api/messages?other=${encodeURIComponent(userB)}`);
      const key = convKey(userA, userB);
      setThreads(prev => ({ ...prev, [key]: data.messages || [] }));
      return data.messages || [];
    } catch {
      return [];
    }
  }, []);

  /* ── Poll every 4 seconds for new messages ── */
  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      fetchConversations();
      fetchUnread();
    }, 4000);
  }, [fetchConversations, fetchUnread]);

  /* ── Boot / auth changes ── */
  useEffect(() => {
    if (!user?.username) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    fetchConversations();
    fetchUnread();
    startPolling();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user?.username, fetchConversations, fetchUnread, startPolling]);

  useEffect(() => {
    if (!user?.username) return;
    const token = getAuthToken();
    if (!token) return;

    const socketUrl = import.meta.env.VITE_API_BASE || window.location.origin;
    const socket = io(socketUrl, {
      auth: { token },
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('new_message', (msg) => {
      if (!msg?.conversationKey) return;
      setThreads(prev => {
        const key = msg.conversationKey;
        const list = prev[key] || [];
        return { ...prev, [key]: [...list, msg] };
      });
      fetchConversations();
      fetchUnread();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.username, fetchConversations, fetchUnread]);

  /* ── Send a message ── */
  // Server POST /api/messages expects: { toUsername, text }
  const sendMessage = useCallback(async (fromUser, toUser, text) => {
    if (!text.trim()) return null;
    try {
      const data = await apiFetchJson('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ toUsername: toUser, text: text.trim() }),
      });
      const msg = data.message;
      const key = convKey(fromUser, toUser);
      // Optimistically add to local thread cache
      setThreads(prev => ({ ...prev, [key]: [...(prev[key] || []), msg] }));
      // Refresh sidebar conversation list
      fetchConversations();
      return msg;
    } catch (err) {
      console.error('sendMessage failed:', err);
      return null;
    }
  }, [fetchConversations]);

  /* ── Mark conversation read ── */
  // Server POST /api/messages/read expects: { fromUsername }
  const markRead = useCallback(async (byUser, fromUser) => {
    try {
      await apiFetchJson('/api/messages/read', {
        method: 'POST',
        body: JSON.stringify({ fromUsername: fromUser }),
      });
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
