import React from 'react';

type DeferredRenderProps = {
    active: boolean;
    placeholder: React.ReactNode;
    children: React.ReactNode;
};

/**
 * DeferredRender component - Renders content immediately when active, placeholder when inactive.
 * Form components handle their own loading states internally.
 */
export const DeferredRender: React.FC<DeferredRenderProps> = ({
    active,
    placeholder,
    children
}) => {
    if (!active) return <>{placeholder}</>;
    return <>{children}</>;
};
