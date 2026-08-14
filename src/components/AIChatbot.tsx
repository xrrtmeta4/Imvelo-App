import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, X, Crown, ThumbsUp, ThumbsDown, Brain, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { showLimitReached } from '@/lib/limitPrompt';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { useAuth } from '@/hooks/useAuth';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  knowledgeGraphUsed?: boolean;
  feedbackGiven?: boolean;
}

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const { canUseChat, incrementChat, getRemainingChats, openUpgrade, isPremium } = useUsageLimits();
  const { user } = useAuth();

  const remainingChats = getRemainingChats();

  const fetchLanguagePreference = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('preferred_language')
      .eq('id', user.id)
      .single();
    
    if (data?.preferred_language) {
      setPreferredLanguage(data.preferred_language);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchLanguagePreference();
    }
  }, [user, fetchLanguagePreference]);



  const sendMessage = async () => {
    if (!input.trim()) return;

    if (!canUseChat()) {
      showLimitReached('chat');
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const apiMessages = [...messages, userMessage].map(m => ({ role: m.role, content: m.content }));
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { messages: apiMessages, preferredLanguage, countAsChat: true }
      });

      if (error) {
        const detail = await error?.context?.text?.().catch(() => '') ?? '';
        if (/limit|429/i.test(detail) || error.message?.includes('429')) {
          showLimitReached('chat');
          return;
        }
        throw error;
      }

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response,
        knowledgeGraphUsed: data.knowledgeGraphUsed,
        feedbackGiven: false
      }]);
      incrementChat();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (msgIndex: number, isPositive: boolean) => {
    if (!user) return;
    
    const msg = messages[msgIndex];
    if (msg.feedbackGiven) return;

    // Mark feedback given
    setMessages(prev => prev.map((m, i) => 
      i === msgIndex ? { ...m, feedbackGiven: true } : m
    ));

    // Find the user message that preceded this assistant message
    const userMsg = messages[msgIndex - 1];
    if (!userMsg) return;

    try {
      // Extract entities from the conversation for graph ingestion
      const entities: { name: string; nodeType: string }[] = [];
      const content = userMsg.content + ' ' + msg.content;
      
      // Simple entity extraction - the ingest function does fuzzy matching
      const words = content.split(/[\s,.:;!?]+/).filter(w => w.length > 3);
      
      // Submit as manual feedback contribution
      await supabase.functions.invoke('knowledge-graph-ingest', {
        body: {
          contributionType: 'manual_feedback',
          entities: [{ name: userMsg.content.substring(0, 100), nodeType: 'crop' }],
          context: { 
            feedback: isPositive ? 'confirmed' : 'corrected',
            userQuery: userMsg.content,
            aiResponse: msg.content.substring(0, 500),
            knowledgeGraphUsed: msg.knowledgeGraphUsed
          },
          userId: user.id
        }
      });

      toast.success(isPositive ? 'Thanks for confirming!' : 'Thanks for the feedback!');
    } catch (err) {
      console.error('Feedback submission error:', err);
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
          <CardTitle className="text-base flex items-center gap-1">
            AI Assistant
            <Brain className="w-3 h-3 text-primary" />
          </CardTitle>
          {!isPremium && (
            <p className="text-xs text-muted-foreground">{remainingChats} daily messages left</p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {messages.length > 0 && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive"
              onClick={() => {
                setMessages([]);
                toast.success('Conversation cleared');
              }}
            >
              <Trash2 className="w-3 h-3" />
              Clear chat
            </Button>
          </div>
        )}
        <div className="h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
          {messages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              Ask about farming
            </p>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx}>
                <div
                  className={`p-2 rounded-lg text-xs ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground ml-8'
                      : 'bg-accent mr-8'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div>
                      {msg.knowledgeGraphUsed && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-primary font-medium mb-1">
                          <Brain className="w-2.5 h-2.5" /> Knowledge Graph
                        </span>
                      )}
                      <div className="whitespace-pre-line">
                        {msg.content.replace(/\*+/g, '').trim()}
                      </div>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === 'assistant' && !msg.feedbackGiven && (
                  <div className="flex gap-1 mt-1 ml-1">
                    <button
                      onClick={() => handleFeedback(idx, true)}
                      className="text-muted-foreground hover:text-primary transition-colors p-0.5"
                      title="Helpful"
                    >
                      <ThumbsUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleFeedback(idx, false)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                      title="Not helpful"
                    >
                      <ThumbsDown className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {msg.role === 'assistant' && msg.feedbackGiven && (
                  <p className="text-[10px] text-muted-foreground ml-1 mt-0.5">Thanks for the feedback!</p>
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
