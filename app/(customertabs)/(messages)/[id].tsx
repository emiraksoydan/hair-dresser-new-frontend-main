import React, { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useSafeNavigation } from '../../hook/useSafeNavigation';

/**
 * Customer message detail page
 * Redirects to screens/chat route to avoid bottom tab and header
 */
const ChatDetailPage = () => {
    const { id: threadId } = useLocalSearchParams<{ id: string }>();
    const router = useSafeNavigation();

    useEffect(() => {
        if (threadId) {
            router.replace(`/(screens)/chat/${threadId}`);
        }
    }, [threadId, router]);

    return null;
};

export default ChatDetailPage;
