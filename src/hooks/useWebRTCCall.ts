import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'active' | 'ended';

interface CallState {
  callId: string | null;
  conversationId: string | null;
  status: CallStatus;
  isMuted: boolean;
  callerId: string | null;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function useWebRTCCall() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [callState, setCallState] = useState<CallState>({
    callId: null,
    conversationId: null,
    status: 'idle',
    isMuted: false,
    callerId: null,
  });
  
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);

  // Initialize remote audio element
  useEffect(() => {
    remoteAudio.current = new Audio();
    remoteAudio.current.autoplay = true;
    return () => {
      cleanupCall();
    };
  }, []);

  const cleanupCall = useCallback(() => {
    console.log('Cleaning up call...');
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (remoteAudio.current) {
      remoteAudio.current.srcObject = null;
    }
  }, []);

  const setupPeerConnection = useCallback(async () => {
    console.log('Setting up peer connection...');
    
    // Get user media
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });
    } catch (error) {
      console.error('Failed to get user media:', error);
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access to make calls.",
        variant: "destructive",
      });
      throw error;
    }
    
    // Create peer connection
    peerConnection.current = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    
    // Add local tracks
    localStream.current.getTracks().forEach(track => {
      peerConnection.current!.addTrack(track, localStream.current!);
    });
    
    // Handle remote stream
    peerConnection.current.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (remoteAudio.current && event.streams[0]) {
        remoteAudio.current.srcObject = event.streams[0];
      }
    };
    
    return peerConnection.current;
  }, [toast]);

  // Start a call
  const startCall = useCallback(async (conversationId: string) => {
    if (!user) return;
    
    try {
      console.log('Starting call for conversation:', conversationId);
      setCallState(prev => ({ ...prev, status: 'calling', conversationId }));
      
      const pc = await setupPeerConnection();
      
      // Create call record
      const { data: callData, error: callError } = await supabase
        .from('calls')
        .insert({
          conversation_id: conversationId,
          caller_id: user.id,
          status: 'ringing',
        })
        .select()
        .single();
      
      if (callError || !callData) {
        throw new Error('Failed to create call');
      }
      
      console.log('Call created:', callData.id);
      setCallState(prev => ({ ...prev, callId: callData.id, callerId: user.id }));
      
      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate');
          await supabase.from('call_signals').insert([{
            call_id: callData.id,
            sender_id: user.id,
            signal_type: 'ice-candidate',
            signal_data: event.candidate.toJSON() as any,
          }]);
        }
      };
      
      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      await supabase.from('call_signals').insert([{
        call_id: callData.id,
        sender_id: user.id,
        signal_type: 'offer',
        signal_data: { sdp: offer.sdp, type: offer.type } as any,
      }]);
      
      console.log('Offer sent');
      
      // Subscribe to signals for answer
      const channel = supabase
        .channel(`call-signals-${callData.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'call_signals',
            filter: `call_id=eq.${callData.id}`,
          },
          async (payload) => {
            const signal = payload.new as any;
            if (signal.sender_id === user.id) return;
            
            console.log('Received signal:', signal.signal_type);
            
            if (signal.signal_type === 'answer' && peerConnection.current) {
              await peerConnection.current.setRemoteDescription(
                new RTCSessionDescription(signal.signal_data)
              );
              setCallState(prev => ({ ...prev, status: 'active' }));
            } else if (signal.signal_type === 'ice-candidate' && peerConnection.current) {
              await peerConnection.current.addIceCandidate(
                new RTCIceCandidate(signal.signal_data)
              );
            }
          }
        )
        .subscribe();
      
      // Subscribe to call status changes
      const callChannel = supabase
        .channel(`call-status-${callData.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'calls',
            filter: `id=eq.${callData.id}`,
          },
          (payload) => {
            const call = payload.new as any;
            console.log('Call status changed:', call.status);
            
            if (call.status === 'declined' || call.status === 'ended') {
              cleanupCall();
              setCallState({
                callId: null,
                conversationId: null,
                status: 'idle',
                isMuted: false,
                callerId: null,
              });
              
              if (call.status === 'declined') {
                toast({ title: "Call Declined" });
              }
              
              supabase.removeChannel(channel);
              supabase.removeChannel(callChannel);
            }
          }
        )
        .subscribe();
        
    } catch (error) {
      console.error('Error starting call:', error);
      cleanupCall();
      setCallState(prev => ({ ...prev, status: 'idle', callId: null }));
      toast({
        title: "Call Failed",
        description: "Could not start the call. Please try again.",
        variant: "destructive",
      });
    }
  }, [user, setupPeerConnection, cleanupCall, toast]);

  // Answer a call
  const answerCall = useCallback(async (callId: string, conversationId: string) => {
    if (!user) return;
    
    try {
      console.log('Answering call:', callId);
      setCallState(prev => ({ 
        ...prev, 
        status: 'active', 
        callId, 
        conversationId 
      }));
      
      const pc = await setupPeerConnection();
      
      // Get the offer
      const { data: signals } = await supabase
        .from('call_signals')
        .select('*')
        .eq('call_id', callId)
        .eq('signal_type', 'offer')
        .single();
      
      if (!signals) {
        throw new Error('No offer found');
      }
      
      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate');
          await supabase.from('call_signals').insert([{
            call_id: callId,
            sender_id: user.id,
            signal_type: 'ice-candidate',
            signal_data: event.candidate.toJSON() as any,
          }]);
        }
      };
      
      // Set remote description and create answer
      const signalData = signals.signal_data as unknown as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(new RTCSessionDescription(signalData));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Send answer
      await supabase.from('call_signals').insert([{
        call_id: callId,
        sender_id: user.id,
        signal_type: 'answer',
        signal_data: { sdp: answer.sdp, type: answer.type } as any,
      }]);
      
      // Update call status
      await supabase
        .from('calls')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('id', callId);
      
      console.log('Answer sent');
      
      // Get pending ICE candidates
      const { data: iceCandidates } = await supabase
        .from('call_signals')
        .select('*')
        .eq('call_id', callId)
        .eq('signal_type', 'ice-candidate')
        .neq('sender_id', user.id);
      
      for (const candidate of iceCandidates || []) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate.signal_data as RTCIceCandidateInit));
      }
      
      // Subscribe to new signals
      const channel = supabase
        .channel(`call-signals-answer-${callId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'call_signals',
            filter: `call_id=eq.${callId}`,
          },
          async (payload) => {
            const signal = payload.new as any;
            if (signal.sender_id === user.id) return;
            
            if (signal.signal_type === 'ice-candidate' && peerConnection.current) {
              await peerConnection.current.addIceCandidate(
                new RTCIceCandidate(signal.signal_data)
              );
            }
          }
        )
        .subscribe();
      
      // Subscribe to call end
      const callChannel = supabase
        .channel(`call-end-${callId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'calls',
            filter: `id=eq.${callId}`,
          },
          (payload) => {
            const call = payload.new as any;
            if (call.status === 'ended') {
              cleanupCall();
              setCallState({
                callId: null,
                conversationId: null,
                status: 'idle',
                isMuted: false,
                callerId: null,
              });
              toast({ title: "Call Ended" });
              supabase.removeChannel(channel);
              supabase.removeChannel(callChannel);
            }
          }
        )
        .subscribe();
        
    } catch (error) {
      console.error('Error answering call:', error);
      cleanupCall();
      setCallState(prev => ({ ...prev, status: 'idle', callId: null }));
    }
  }, [user, setupPeerConnection, cleanupCall, toast]);

  // Decline a call
  const declineCall = useCallback(async (callId: string) => {
    console.log('Declining call:', callId);
    await supabase
      .from('calls')
      .update({ status: 'declined', ended_at: new Date().toISOString() })
      .eq('id', callId);
    
    setCallState({
      callId: null,
      conversationId: null,
      status: 'idle',
      isMuted: false,
      callerId: null,
    });
  }, []);

  // End a call
  const endCall = useCallback(async () => {
    if (!callState.callId) return;
    
    console.log('Ending call:', callState.callId);
    
    await supabase
      .from('calls')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', callState.callId);
    
    cleanupCall();
    setCallState({
      callId: null,
      conversationId: null,
      status: 'idle',
      isMuted: false,
      callerId: null,
    });
  }, [callState.callId, cleanupCall]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
    }
  }, []);

  return {
    callState,
    startCall,
    answerCall,
    declineCall,
    endCall,
    toggleMute,
    setCallState,
  };
}
