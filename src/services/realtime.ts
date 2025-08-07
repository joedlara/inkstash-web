import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useState, useCallback, useRef } from 'react';

export interface LiveAuction {
  id: string;
  title: string;
  currentBid: number;
  startingBid: number;
  bidCount: number;
  timeRemaining: number;
  status: 'upcoming' | 'live' | 'ended';
  sellerId: string;
  category: string;
  imageUrl: string;
  participants: string[];
}

export interface Bid {
  id: string;
  auctionId: string;
  userId: string;
  username: string;
  amount: number;
  timestamp: Date;
  isWinning: boolean;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'message' | 'bid' | 'system' | 'emoji';
  metadata?: Record<string, any>;
}

export interface LiveNotification {
  id: string;
  userId: string;
  type:
    | 'bid_outbid'
    | 'auction_ending'
    | 'auction_won'
    | 'new_follower'
    | 'item_watchlist';
  title: string;
  message: string;
  actionUrl?: string;
  timestamp: Date;
  read: boolean;
}

export interface UserPresence {
  userId: string;
  username: string;
  status: 'online' | 'bidding' | 'away';
  currentRoom?: string;
  lastSeen: Date;
}

export class RealtimeService {
  private supabase: any;
  private channels: Map<string, RealtimeChannel> = new Map();
  private presenceChannel: RealtimeChannel | null = null;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  subscribeToAuction(
    auctionId: string,
    callbacks: {
      onBidUpdate?: (bid: Bid) => void;
      onAuctionUpdate?: (auction: LiveAuction) => void;
      onChatMessage?: (message: ChatMessage) => void;
      onParticipantJoin?: (userId: string) => void;
      onParticipantLeave?: (userId: string) => void;
    }
  ): () => void {
    const channelName = `auction:${auctionId}`;

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: `auction_id=eq.${auctionId}`,
        },
        (payload: any) => {
          callbacks.onBidUpdate?.(payload.new as Bid);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'auctions',
          filter: `id=eq.${auctionId}`,
        },
        (payload: any) => {
          callbacks.onAuctionUpdate?.(payload.new as LiveAuction);
        }
      )
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
        callbacks.onChatMessage?.(payload as ChatMessage);
      })
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        console.log('Auction participants:', presenceState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        callbacks.onParticipantJoin?.(key);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        callbacks.onParticipantLeave?.(key);
      })
      .subscribe();

    this.channels.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
    };
  }

  async joinAuction(
    auctionId: string,
    userInfo: { id: string; username: string }
  ): Promise<void> {
    const channelName = `auction:${auctionId}`;
    const channel = this.channels.get(channelName);

    if (channel) {
      await channel.track({
        user_id: userInfo.id,
        username: userInfo.username,
        joined_at: new Date().toISOString(),
        status: 'watching',
      });
    }
  }

  async placeBid(
    auctionId: string,
    userId: string,
    amount: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('bids')
        .insert({
          auction_id: auctionId,
          user_id: userId,
          amount,
          timestamp: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      const channelName = `auction:${auctionId}`;
      const channel = this.channels.get(channelName);
      if (channel) {
        await channel.track({ status: 'bidding' });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to place bid' };
    }
  }

  async sendChatMessage(
    roomId: string,
    userId: string,
    message: string,
    type: 'message' | 'emoji' = 'message'
  ): Promise<void> {
    const channelName = `auction:${roomId}`;
    const channel = this.channels.get(channelName);

    if (channel) {
      const chatMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        roomId,
        userId,
        username: '',
        message,
        timestamp: new Date(),
        type,
      };

      await channel.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: chatMessage,
      });
    }
  }

  subscribeToNotifications(
    userId: string,
    onNotification: (notification: LiveNotification) => void
  ): () => void {
    const channel = this.supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          onNotification(payload.new as LiveNotification);
        }
      )
      .subscribe();

    return () => channel.unsubscribe();
  }

  initializePresence(userInfo: { id: string; username: string }): () => void {
    this.presenceChannel = this.supabase
      .channel('global_presence')
      .on('presence', { event: 'sync' }, () => {
        const presenceState = this.presenceChannel?.presenceState();
        console.log('Online users:', presenceState);
      })
      .subscribe();

    this.presenceChannel.track({
      user_id: userInfo.id,
      username: userInfo.username,
      last_seen: new Date().toISOString(),
      status: 'online',
    });

    return () => {
      this.presenceChannel?.unsubscribe();
      this.presenceChannel = null;
    };
  }

  getAuctionParticipants(auctionId: string): UserPresence[] {
    const channelName = `auction:${auctionId}`;
    const channel = this.channels.get(channelName);

    if (!channel) return [];

    const presenceState = channel.presenceState();
    return Object.values(presenceState).flat() as UserPresence[];
  }

  disconnect(): void {
    this.channels.forEach(channel => channel.unsubscribe());
    this.channels.clear();
    this.presenceChannel?.unsubscribe();
    this.presenceChannel = null;
  }
}

export const useLiveAuction = (auctionId: string) => {
  const [auction, setAuction] = useState<LiveAuction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<UserPresence[]>([]);
  const [loading, setLoading] = useState(true);

  const realtimeService = useRef<RealtimeService | null>(null);

  useEffect(() => {
    if (!auctionId) return;

    const initializeAuction = async () => {
      realtimeService.current = new RealtimeService(supabase);

      const { data: auctionData } = await supabase
        .from('auctions')
        .select('*')
        .eq('id', auctionId)
        .single();

      const { data: bidsData } = await supabase
        .from('bids')
        .select('*')
        .eq('auction_id', auctionId)
        .order('timestamp', { ascending: true });

      setAuction(auctionData);
      setBids(bidsData || []);
      setLoading(false);

      const unsubscribe = realtimeService.current.subscribeToAuction(
        auctionId,
        {
          onBidUpdate: newBid => {
            setBids(prev => [...prev, newBid]);
            setAuction(prev =>
              prev
                ? {
                    ...prev,
                    currentBid: newBid.amount,
                    bidCount: prev.bidCount + 1,
                  }
                : null
            );
          },
          onAuctionUpdate: updatedAuction => {
            setAuction(updatedAuction);
          },
          onChatMessage: message => {
            setChatMessages(prev => [...prev, message]);
          },
          onParticipantJoin: userId => {
            console.log('User joined:', userId);
          },
          onParticipantLeave: userId => {
            console.log('User left:', userId);
          },
        }
      );

      return unsubscribe;
    };

    const unsubscribe = initializeAuction();

    return () => {
      unsubscribe.then(unsub => unsub?.());
      realtimeService.current?.disconnect();
    };
  }, [auctionId]);

  const placeBid = useCallback(
    async (amount: number, userId: string) => {
      if (!realtimeService.current)
        return { success: false, error: 'Not connected' };
      return await realtimeService.current.placeBid(auctionId, userId, amount);
    },
    [auctionId]
  );

  const sendMessage = useCallback(
    async (message: string, userId: string) => {
      if (!realtimeService.current) return;
      await realtimeService.current.sendChatMessage(auctionId, userId, message);
    },
    [auctionId]
  );

  const joinAuction = useCallback(
    async (userInfo: { id: string; username: string }) => {
      if (!realtimeService.current) return;
      await realtimeService.current.joinAuction(auctionId, userInfo);
    },
    [auctionId]
  );

  return {
    auction,
    bids,
    chatMessages,
    participants,
    loading,
    placeBid,
    sendMessage,
    joinAuction,
    currentHighBid:
      bids.length > 0
        ? Math.max(...bids.map(b => b.amount))
        : auction?.startingBid || 0,
  };
};

export const useNotifications = (userId: string) => {
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const realtimeService = new RealtimeService(supabase);

    const loadNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(50);

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    };

    loadNotifications();

    const unsubscribe = realtimeService.subscribeToNotifications(
      userId,
      notification => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    );

    return () => {
      unsubscribe();
      realtimeService.disconnect();
    };
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
};

export const usePresence = (
  userInfo: { id: string; username: string } | null
) => {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const realtimeService = useRef<RealtimeService | null>(null);

  useEffect(() => {
    if (!userInfo) return;

    realtimeService.current = new RealtimeService(supabase);
    const unsubscribe = realtimeService.current.initializePresence(userInfo);

    return () => {
      unsubscribe();
      realtimeService.current?.disconnect();
    };
  }, [userInfo]);

  return {
    onlineUsers,
    isOnline: (userId: string) => onlineUsers.some(u => u.userId === userId),
  };
};
