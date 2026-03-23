/**
 * Free barber messages page
 * Uses shared MessageThreadList component
 */
import React from 'react';
import { MessageThreadList } from '../../components/messages/MessageThreadList';

const FreeBarberMessagesPage = () => {
    return (
        <MessageThreadList
            routePrefix="/(freebarbertabs)/(messages)"
            iconSource="store"
        />
    );
};

export default FreeBarberMessagesPage;
