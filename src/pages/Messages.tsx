import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageCircle, Send, ArrowLeft, Check, CheckCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  profiles?: { full_name: string };
}

interface Conversation {
  id: string;
  name: string;
  unreadCount: number;
  lastMessage?: string;
  lastMessageTime?: string;
}

const Messages = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-select conversation from URL params
  useEffect(() => {
    const sellerId = searchParams.get('seller');
    if (sellerId && user) {
      setSelectedConversation(sellerId);
    }
  }, [searchParams, user]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selectedConversation && user) {
      fetchMessages(selectedConversation);
      markMessagesAsRead(selectedConversation);
      
      // Subscribe to new messages in real-time
      const messageChannel = supabase
        .channel(`messages-${selectedConversation}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            const newMsg = payload.new as Message;
            if (
              (newMsg.sender_id === selectedConversation && newMsg.receiver_id === user.id) ||
              (newMsg.sender_id === user.id && newMsg.receiver_id === selectedConversation)
            ) {
              setMessages((prev) => {
                // Avoid duplicates
                if (prev.find(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              // Mark as read if we received it
              if (newMsg.receiver_id === user.id) {
                markMessageAsRead(newMsg.id);
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            const updatedMsg = payload.new as Message;
            setMessages((prev) =>
              prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
            );
          }
        )
        .subscribe();

      // Typing indicator channel using presence
      const typingChannel = supabase.channel(`typing-${[user.id, selectedConversation].sort().join('-')}`, {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      typingChannel
        .on('presence', { event: 'sync' }, () => {
          const state = typingChannel.presenceState();
          const otherTyping = Object.entries(state).some(([key, value]: [string, any]) => 
            key === selectedConversation && value[0]?.typing
          );
          setOtherUserTyping(otherTyping);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(messageChannel);
        supabase.removeChannel(typingChannel);
      };
    }
  }, [selectedConversation, user]);

  const handleTyping = async () => {
    if (!selectedConversation || !user) return;

    const channel = supabase.channel(`typing-${[user.id, selectedConversation].sort().join('-')}`);
    
    if (!isTyping) {
      setIsTyping(true);
      await channel.track({ typing: true });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false);
      await channel.track({ typing: false });
    }, 2000);
  };

  const fetchConversations = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('messages')
      .select('sender_id, receiver_id, content, created_at, read')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (data) {
      const conversationMap = new Map<string, Conversation>();
      
      for (const msg of data) {
        const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        
        if (!conversationMap.has(otherId)) {
          // Fetch profile for this user
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', otherId)
            .single();

          conversationMap.set(otherId, {
            id: otherId,
            name: profile?.full_name || 'Unknown',
            unreadCount: 0,
            lastMessage: msg.content,
            lastMessageTime: msg.created_at,
          });
        }
        
        // Count unread messages
        if (msg.receiver_id === user.id && !msg.read) {
          const conv = conversationMap.get(otherId)!;
          conv.unreadCount++;
        }
      }
      
      setConversations(Array.from(conversationMap.values()));
    }
  };

  const fetchMessages = async (otherUserId: string) => {
    if (!user) return;

    const { data } = await supabase
      .from('messages')
      .select('*, profiles:sender_id(full_name)')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
  };

  const markMessagesAsRead = async (otherUserId: string) => {
    if (!user) return;

    await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_id', otherUserId)
      .eq('receiver_id', user.id)
      .eq('read', false);
  };

  const markMessageAsRead = async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('id', messageId);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: selectedConversation,
      content: messageContent,
    });

    if (error) {
      toast.error('Umlayeto awuthunyelelwanga');
      setNewMessage(messageContent);
    }
  };

  const getConversationName = () => {
    const conv = conversations.find(c => c.id === selectedConversation);
    return conv?.name || 'Unknown';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="bg-primary text-primary-foreground py-4 px-4">
          <h1 className="text-xl font-bold">Imilayeto</h1>
        </header>
        <div className="max-w-screen-sm mx-auto px-4 py-6">
          <p className="text-center text-muted-foreground">Ngena kuqala kutfumela imilayeto</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <h1 className="text-xl font-bold">Imilayeto</h1>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6">
        {!selectedConversation ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Imilayeto Yemakhasimende
              </CardTitle>
            </CardHeader>
            <CardContent>
              {conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Ute imilayeto
                </p>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv.id)}
                      className="w-full p-3 rounded-lg bg-accent/50 hover:bg-accent text-left relative"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{conv.name}</p>
                        {conv.unreadCount > 0 && (
                          <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {conv.lastMessage}
                        </p>
                      )}
                      {conv.lastMessageTime && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(conv.lastMessageTime).toLocaleString('ss-ZA')}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex-1">
                  <p className="font-semibold">{getConversationName()}</p>
                  {otherUserTyping && (
                    <p className="text-xs text-primary animate-pulse">Uyabhala...</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-96 overflow-y-auto space-y-2 p-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg max-w-[80%] ${
                      msg.sender_id === user.id
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-accent mr-auto'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <p className="text-xs opacity-70">
                        {new Date(msg.created_at).toLocaleTimeString('ss-ZA', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                      {msg.sender_id === user.id && (
                        msg.read ? (
                          <CheckCheck className="w-3 h-3 text-primary-foreground/70" />
                        ) : (
                          <Check className="w-3 h-3 text-primary-foreground/50" />
                        )
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Bhala umlayeto..."
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Messages;