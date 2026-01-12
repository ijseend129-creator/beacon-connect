import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  status: MessageStatus;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  view_once?: boolean;
  sender?: {
    username: string;
    avatar_url: string | null;
  };
}

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchMessages = async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      // First fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, created_at, status, file_url, file_name, file_type, view_once')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      if (!messagesData || messagesData.length === 0) {
        setMessages([]);
        setLoading(false);
        return;
      }

      // Get unique sender IDs
      const senderIds = [...new Set(messagesData.map(m => m.sender_id))];

      // Fetch profiles for all senders
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', senderIds);

      // Create a map of profiles by ID
      const profilesMap = new Map(
        (profilesData || []).map(p => [p.id, { username: p.username, avatar_url: p.avatar_url }])
      );

      setMessages(
        messagesData.map((msg) => ({
          id: msg.id,
          conversation_id: msg.conversation_id,
          sender_id: msg.sender_id,
          content: msg.content,
          created_at: msg.created_at,
          status: msg.status as MessageStatus,
          file_url: msg.file_url,
          file_name: msg.file_name,
          file_type: msg.file_type,
          view_once: msg.view_once,
          sender: profilesMap.get(msg.sender_id) || { username: 'Onbekend', avatar_url: null },
        }))
      );
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File): Promise<{ url: string; name: string; type: string } | null> => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(fileName);

    return { url: publicUrl, name: file.name, type: file.type };
  };

  const sendMessage = async (
    content: string, 
    file?: File, 
    viewOnce?: boolean, 
    scheduledAt?: Date,
    onMessageSent?: () => void
  ) => {
    if (!conversationId || !user || (!content.trim() && !file)) return null;

    try {
      let fileData: { url: string; name: string; type: string } | null = null;
      
      if (file) {
        fileData = await uploadFile(file);
        if (!fileData) return null;
      }

      // If scheduled, save to scheduled_messages instead
      if (scheduledAt) {
        const { data, error } = await supabase
          .from('scheduled_messages')
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content: content.trim() || (fileData ? fileData.name : ''),
            file_url: fileData?.url,
            file_name: fileData?.name,
            file_type: fileData?.type,
            view_once: viewOnce || false,
            scheduled_at: scheduledAt.toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      // Regular message
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim() || (fileData ? fileData.name : ''),
          file_url: fileData?.url,
          file_name: fileData?.name,
          file_type: fileData?.type,
          view_once: viewOnce || false,
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation's updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Call callback for achievement tracking
      if (onMessageSent) {
        onMessageSent();
      }

      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  };

  // Reset messages and refetch when conversation changes
  useEffect(() => {
    setMessages([]);
    setLoading(true);
    fetchMessages();
  }, [conversationId]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Check if message already exists to prevent duplicates
          setMessages((prev) => {
            if (prev.some(m => m.id === payload.new.id)) {
              return prev;
            }
            
            // Fetch sender profile and add message
            supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', payload.new.sender_id)
              .single()
              .then(({ data: profile }) => {
                const newMessage: Message = {
                  id: payload.new.id,
                  conversation_id: payload.new.conversation_id,
                  sender_id: payload.new.sender_id,
                  content: payload.new.content,
                  created_at: payload.new.created_at,
                  status: (payload.new.status as MessageStatus) || 'sent',
                  file_url: payload.new.file_url,
                  file_name: payload.new.file_name,
                  file_type: payload.new.file_type,
                  view_once: payload.new.view_once,
                  sender: profile || undefined,
                };
                
                setMessages((current) => {
                  if (current.some(m => m.id === newMessage.id)) {
                    return current;
                  }
                  return [...current, newMessage];
                });
              });
            
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return { messages, loading, sendMessage, fetchMessages };
}
