import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

/**
 * FreeBarber message detail page
 * Redirects to screens/chat route to avoid bottom tab and header
 */
const ChatDetailPage = () => {
    const { id: threadId } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    useEffect(() => {
        if (threadId) {
            router.replace(`/(screens)/chat/${threadId}`);
        }
    }, [threadId, router]);

    return null;
};

export default ChatDetailPage;
