/**
 * Customer messages page
 * Uses shared MessageThreadList component
 */
import React from 'react';
import { MessageThreadList } from '../../components/messages/MessageThreadList';

const CustomerMessagesPage = () => {
    return (
        <MessageThreadList
            routePrefix="/(customertabs)/(messages)"
            iconSource="store"
        />
    );
};

export default CustomerMessagesPage;
