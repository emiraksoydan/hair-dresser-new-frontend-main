/**
 * Barber store messages page
 * Uses shared MessageThreadList component
 */
import React from 'react';
import { MessageThreadList } from '../../components/messages/MessageThreadList';

const BarberStoreMessagesPage = () => {
    return (
        <MessageThreadList
            routePrefix="/(barberstoretabs)/(messages)"
            iconSource="account"
        />
    );
};

export default BarberStoreMessagesPage;
