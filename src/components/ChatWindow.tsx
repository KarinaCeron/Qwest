import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';

type Msg = { role: 'user' | 'assistant'; content: string };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function ChatWindow() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    const userMsg: Msg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in to use chat');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Chat failed (${response.status})`);
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || 'No response' }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${e.message || 'Unexpected error'}` }]);
    }
    setIsLoading(false);
  };

  return (
    <>
      {!open && (
        <Button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-primary shadow-lg hover:scale-105 transition-transform" size="icon">
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}
      {open && (
        <Card className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] flex flex-col shadow-2xl border">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-card rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm">Job Assistant</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Hi! I'm your job assistant.</p>
                <p className="mt-1">Ask me about your CV or applications.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
          <div className="border-t p-3">
            <form onSubmit={e => { e.preventDefault(); send(); }} className="flex gap-2">
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} placeholder="Type your question..." className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" disabled={isLoading} />
              <Button type="submit" size="icon" className="shrink-0" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      )}
    </>
  );
}
