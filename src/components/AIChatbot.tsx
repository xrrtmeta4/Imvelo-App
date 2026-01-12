import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, X, Crown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { useAuth } from '@/hooks/useAuth';

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const { canUseChat, incrementChat, getRemainingChats, openUpgrade, isPremium } = useUsageLimits();
  const { user } = useAuth();

  const remainingChats = getRemainingChats();

  useEffect(() => {
    if (user) {
      fetchLanguagePreference();
    }
  }, [user]);

  const fetchLanguagePreference = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('preferred_language')
      .eq('id', user.id)
      .single();
    
    if (data?.preferred_language) {
      setPreferredLanguage(data.preferred_language);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    if (!canUseChat()) {
      toast.error('Daily chat limit reached. Upgrade for unlimited conversations!');
      return;
    }

    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { messages: [...messages, userMessage], preferredLanguage }
      });

      if (error) throw error;

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      incrementChat();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-40 rounded-full w-14 h-14 shadow-lg"
        size="icon"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-20 right-4 w-80 z-40 shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">AI Assistant</CardTitle>
          {!isPremium && (
            <p className="text-xs text-muted-foreground">{remainingChats}/10 messages left today</p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
          {messages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              Ask about farming
            </p>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-lg text-xs ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground ml-8'
                    : 'bg-accent mr-8'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="whitespace-pre-line">
                    {msg.content.replace(/\*+/g, '').trim()}
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="p-2 rounded-lg text-xs bg-accent mr-8">
              Loading...
            </div>
          )}
        </div>
        
        {!canUseChat() ? (
          <div className="text-center py-2">
            <Button onClick={openUpgrade} size="sm" className="gap-2">
              <Crown className="w-4 h-4" />
              Upgrade for Unlimited
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="Type your question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={loading}
            />
            <Button onClick={sendMessage} disabled={loading} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIChatbot;
