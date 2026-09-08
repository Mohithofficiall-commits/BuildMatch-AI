import { useState, useEffect, useRef } from 'react';
import { fetchProjects, fetchMessages, sendMessage } from '@/lib/data';
import { useAuth } from '@/lib/auth';
import type { Project, Message } from '@/lib/types';
import { LoadingState, EmptyState, Badge } from '@/components/ui';
import { MessageSquare, Send, Paperclip, Search } from 'lucide-react';

export default function Messages() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const projs = await fetchProjects();
        setProjects(projs);
        if (projs.length > 0) setSelectedProject(projs[0].id);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    (async () => { try { setMessages(await fetchMessages(selectedProject)); } catch { /* ignore */ } })();
  }, [selectedProject]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selectedProject || !user) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    try {
      const project = projects.find((p) => p.id === selectedProject);
      const receiverId = user.role === 'homeowner' ? project?.engineer_id : project?.homeowner_id;
      if (!receiverId) return;
      const msg = await sendMessage(selectedProject, user.id, receiverId, user.role, content);
      setMessages((prev) => [...prev, msg]);
    } catch { /* ignore */ } finally { setSending(false); }
  };

  if (loading) return <LoadingState text="Loading messages..." />;

  const currentProject = projects.find((p) => p.id === selectedProject);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Messages</h1>
        <p className="muted mt-1">Communicate with your engineer about your project</p>
      </div>

      {projects.length === 0 ? (
        <EmptyState icon={<MessageSquare className="w-7 h-7" />} title="No conversations" description="Start a project to begin messaging with your engineer." />
      ) : (
        <div className="card overflow-hidden flex h-[600px]">
          <div className="w-72 border-r border-navy-100 flex-col hidden md:flex">
            <div className="p-3 border-b border-navy-100">
              <div className="relative">
                <Search className="w-4 h-4 text-navy-300 absolute left-3 top-1/2 -translate-y-1/2" />
                <input className="input pl-9 text-sm" placeholder="Search..." />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {projects.map((p) => (
                <button key={p.id} onClick={() => setSelectedProject(p.id)} className={`w-full text-left p-3 border-b border-navy-50 transition-colors ${selectedProject === p.id ? 'bg-royal-50' : 'hover:bg-navy-50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-navy-100 flex items-center justify-center text-navy-600 text-xs font-bold shrink-0">{p.engineer?.name?.charAt(0) ?? 'P'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy-900 truncate">{p.title}</p>
                      <p className="text-xs muted truncate">{p.engineer?.name ?? 'Unassigned'}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {currentProject && (
              <div className="p-4 border-b border-navy-100 flex items-center justify-between">
                <div><p className="font-semibold text-navy-900">{currentProject.title}</p><p className="text-xs muted">{currentProject.engineer?.name ?? 'Unassigned'} · {currentProject.location}</p></div>
                <Badge variant={currentProject.status === 'active' ? 'royal' : 'success'}>{currentProject.status}</Badge>
              </div>
            )}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-navy-50/30">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm muted">No messages yet. Start the conversation!</div>
              ) : (
                messages.map((m) => {
                  const isMe = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${isMe ? 'bg-royal-600 text-white' : 'bg-white border border-navy-100 text-navy-900'}`}>
                        <p className="text-sm">{m.content}</p>
                        {m.attachment_name && <div className={`flex items-center gap-1.5 mt-2 text-xs ${isMe ? 'text-royal-200' : 'text-royal-600'}`}><Paperclip className="w-3 h-3" /> {m.attachment_name}</div>}
                        <p className={`text-[10px] mt-1 ${isMe ? 'text-royal-200' : 'muted'}`}>{new Date(m.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-3 border-t border-navy-100 flex gap-2">
              <input className="input flex-1" placeholder="Type a message..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} disabled={sending} />
              <button onClick={handleSend} disabled={sending || !input.trim()} className="btn-primary px-4"><Send className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
