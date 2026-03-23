import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ChatDetailScreen } from '../../components/chat/ChatDetailScreen';

/**
 * Chat detail screen page
 * Uses the shared ChatDetailScreen component
 * Accessible via route: /chat/[threadId]
 */
const ChatDetailPage = () => {
    const { threadId } = useLocalSearchParams<{ threadId: string }>();

    if (!threadId) {
        return null;
    }

    return <ChatDetailScreen threadId={threadId} />;
};

export default ChatDetailPage;

