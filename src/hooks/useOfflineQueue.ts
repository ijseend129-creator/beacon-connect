import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface QueuedMessage {
  id: string;
  conversationId: string;
  content: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  clientTimestamp: string;
}

const STORAGE_KEY = 'beacon_offline_queue';

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();

  // Load queue from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setQueue(JSON.parse(stored));
    }
  }, []);

  // Save queue to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }, [queue]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Add message to queue
  const addToQueue = useCallback((message: Omit<QueuedMessage, 'id'>) => {
    const newMessage: QueuedMessage = {
      ...message,
      id: crypto.randomUUID(),
    };
    setQueue(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  // Sync queued messages when online
  const syncQueue = useCallback(async () => {
    if (!isOnline || !user || queue.length === 0 || syncing) return;

    setSyncing(true);
    const successIds: string[] = [];

    for (const msg of queue) {
      try {
        const { error } = await supabase.from('messages').insert({
          conversation_id: msg.conversationId,
          sender_id: user.id,
          content: msg.content,
          file_url: msg.fileUrl,
          file_name: msg.fileName,
          file_type: msg.fileType,
          status: 'sent',
        });

        if (!error) {
          successIds.push(msg.id);
        }
      } catch (error) {
        console.error('Error syncing message:', error);
      }
    }

    setQueue(prev => prev.filter(msg => !successIds.includes(msg.id)));
    setSyncing(false);
  }, [isOnline, user, queue, syncing]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && queue.length > 0) {
      syncQueue();
    }
  }, [isOnline, queue.length, syncQueue]);

  return {
    isOnline,
    queue,
    addToQueue,
    syncQueue,
    syncing,
  };
}
