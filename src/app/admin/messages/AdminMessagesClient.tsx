'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Mail, CheckCircle, Clock, XCircle, ChevronLeft, Send, X } from 'lucide-react';

interface ContactMessage {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  adminReplyText: string | null;
  repliedAt: string | null;
  createdAt: string;
  handledByName: string | null;
}

export default function AdminMessagesClient() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [readFilter, setReadFilter] = useState('');

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (readFilter) params.set('read', readFilter);

    try {
      const res = await fetch(`/api/admin/messages?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, readFilter]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSelectMessage = async (msg: ContactMessage) => {
    setSelectedMessage(msg);
    setReplyText('');
    setActionMessage(null);
    if (!msg.isRead) {
      try {
        await fetch(`/api/admin/messages/${msg.id}/action`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_read' })
        });
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
        setSelectedMessage(prev => prev ? { ...prev, isRead: true } : null);
      } catch (e) {
        console.error('Failed to mark as read', e);
      }
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedMessage) return;
    try {
      const res = await fetch(`/api/admin/messages/${selectedMessage.id}/action`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', status: newStatus })
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, status: data.status as any, handledByName: 'You' } : m));
        setSelectedMessage(prev => prev ? { ...prev, status: data.status as any, handledByName: 'You' } : null);
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch (e) {
      console.error(e);
      alert('Network error');
    }
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;
    setIsSendingReply(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/messages/${selectedMessage.id}/action`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reply', replyText: replyText.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        const now = new Date().toISOString();
        setMessages(prev => prev.map(m => m.id === selectedMessage.id
          ? { ...m, status: 'resolved', adminReplyText: replyText.trim(), repliedAt: now, handledByName: 'You' }
          : m
        ));
        setSelectedMessage(prev => prev ? {
          ...prev,
          status: 'resolved',
          adminReplyText: replyText.trim(),
          repliedAt: now,
          handledByName: 'You',
        } : null);
        setReplyText('');
        setActionMessage({ text: 'Reply sent — ticket resolved and customer notified.', type: 'success' });
      } else {
        setActionMessage({ text: data.error || 'Failed to send reply.', type: 'error' });
      }
    } catch (e) {
      setActionMessage({ text: 'Network error. Please retry.', type: 'error' });
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleCloseWithoutReply = async () => {
    if (!selectedMessage) return;
    setIsClosing(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/messages/${selectedMessage.id}/action`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === selectedMessage.id
          ? { ...m, status: 'closed', handledByName: 'You' }
          : m
        ));
        setSelectedMessage(prev => prev ? { ...prev, status: 'closed', handledByName: 'You' } : null);
        setActionMessage({ text: 'Ticket closed without reply.', type: 'success' });
      } else {
        setActionMessage({ text: data.error || 'Failed to close ticket.', type: 'error' });
      }
    } catch (e) {
      setActionMessage({ text: 'Network error. Please retry.', type: 'error' });
    } finally {
      setIsClosing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'new': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Mail className="w-3 h-3" /> New</span>;
      case 'in_progress': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3" /> In Progress</span>;
      case 'resolved': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" /> Resolved</span>;
      case 'closed': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"><XCircle className="w-3 h-3" /> Closed</span>;
      default: return null;
    }
  };

  if (selectedMessage) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setSelectedMessage(null)}
          className="text-gray-500 hover:text-gray-900 flex items-center gap-2 font-medium"
        >
          <ChevronLeft className="w-5 h-5" /> Back to messages
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{selectedMessage.subject}</h1>
              <div className="flex flex-col gap-1 text-sm text-gray-600">
                <p><span className="font-medium text-gray-900">From:</span> {selectedMessage.name} &lt;{selectedMessage.email}&gt;</p>
                <p><span className="font-medium text-gray-900">Date:</span> {new Date(selectedMessage.createdAt).toLocaleString()}</p>
                {selectedMessage.handledByName && (
                  <p><span className="font-medium text-gray-900">Handled By:</span> {selectedMessage.handledByName}</p>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-3 min-w-[200px]">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Status</label>
                <select 
                  value={selectedMessage.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#8C6A3F] bg-white text-sm"
                >
                  <option value="new">New</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <a 
                href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject)}`}
                className="inline-flex justify-center items-center gap-2 px-4 py-2 bg-[#8C6A3F] text-white text-sm font-medium rounded-lg hover:bg-[#7a5c37] transition-colors"
              >
                <Send className="w-4 h-4" />
                Reply via Email
              </a>
            </div>
          </div>

          <hr className="border-gray-100 mb-8" />
          
          <div className="prose max-w-none mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Message</h3>
            <div className="bg-gray-50 p-6 rounded-lg text-gray-800 whitespace-pre-wrap font-sans text-sm border border-gray-100">
              {selectedMessage.message}
            </div>
          </div>

          {/* Admin Reply — shown if already replied */}
          {selectedMessage.adminReplyText && (
            <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-green-800">
                  Replied {selectedMessage.repliedAt ? new Date(selectedMessage.repliedAt).toLocaleString() : ''}
                </span>
              </div>
              <p className="text-sm text-green-900 whitespace-pre-wrap">{selectedMessage.adminReplyText}</p>
            </div>
          )}

          {/* Reply & Close actions — shown when not yet resolved/closed */}
          {selectedMessage.status !== 'resolved' && selectedMessage.status !== 'closed' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Reply & Resolve</h3>
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Write a reply to this customer..."
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8C6A3F] resize-y"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSendReply}
                  disabled={isSendingReply || !replyText.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#8C6A3F] text-white text-sm font-semibold rounded-lg hover:bg-[#7a5c37] transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {isSendingReply ? 'Sending...' : 'Send Reply & Resolve'}
                </button>
                <button
                  onClick={handleCloseWithoutReply}
                  disabled={isClosing}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-600 text-sm font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  {isClosing ? 'Closing...' : 'Close Without Reply'}
                </button>
              </div>
              {actionMessage && (
                <p className={`text-sm font-medium ${actionMessage.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
                  {actionMessage.text}
                </p>
              )}
            </div>
          )}

          {/* Closed state with no reply — clear dismissal message */}
          {selectedMessage.status === 'closed' && !selectedMessage.adminReplyText && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-3">
              <XCircle className="w-5 h-5 text-gray-400 shrink-0" />
              <p className="text-sm text-gray-600">This ticket was closed without a reply (e.g. spam, duplicate, or already handled).</p>
            </div>
          )}

          {actionMessage && (selectedMessage.status === 'resolved' || selectedMessage.status === 'closed') && (
            <p className={`mt-4 text-sm font-medium ${actionMessage.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
              {actionMessage.text}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Contact Messages</h1>
          <p className="text-gray-500 mt-2">Manage incoming inquiries and support requests.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex gap-4 w-full md:w-auto shrink-0">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#8C6A3F] bg-white text-sm"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select 
            value={readFilter}
            onChange={(e) => setReadFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#8C6A3F] bg-white text-sm"
          >
            <option value="">All Messages</option>
            <option value="false">Unread Only</option>
            <option value="true">Read Only</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Sender</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Subject</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loading messages...</td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-lg font-medium text-gray-900">No messages found</p>
                  </td>
                </tr>
              ) : (
                messages.map(msg => (
                  <tr 
                    key={msg.id} 
                    onClick={() => handleSelectMessage(msg)}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${!msg.isRead ? 'bg-blue-50/30' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {!msg.isRead && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                        <div>
                          <p className={`text-gray-900 ${!msg.isRead ? 'font-bold' : 'font-medium'}`}>{msg.name}</p>
                          <p className="text-gray-500 text-xs">{msg.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-gray-800 ${!msg.isRead ? 'font-bold' : ''}`}>
                      {msg.subject}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(msg.status)}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {new Date(msg.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
