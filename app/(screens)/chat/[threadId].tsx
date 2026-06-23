import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ChatDetailScreen } from '../../components/chat/ChatDetailScreen';

/**
 * Chat detail screen page
 * Uses the shared ChatDetailScreen component
 * Accessible via route: /chat/[threadId]
 */
const ChatDetailPage = () => {
    const { threadId, source } = useLocalSearchParams<{ threadId: string; source?: 'social' | 'main' }>();

    if (!threadId) {
        return null;
    }

    return (
        <ChatDetailScreen
            threadId={threadId}
            source={source === 'social' ? 'social' : 'main'}
        />
    );
};

export default ChatDetailPage;
