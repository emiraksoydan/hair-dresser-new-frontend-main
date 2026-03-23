import React, { useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

type DeferredRenderProps = {
    active: boolean;
    placeholder: React.ReactNode;
    children: React.ReactNode;
};

/**
 * DeferredRender component - Delays rendering of heavy components until after interactions complete
 *
 * This component uses InteractionManager.runAfterInteractions() to defer rendering
 * until the UI thread is idle, preventing janky animations and improving perceived performance.
 *
 * @param active - Whether the deferred content should be rendered
 * @param placeholder - Component to show while waiting (typically skeleton/loading)
 * @param children - The actual content to render after interactions complete
 */
export const DeferredRender: React.FC<DeferredRenderProps> = ({
    active,
    placeholder,
    children
}) => {
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (active) {
            // Use InteractionManager to defer rendering until animations complete
            const task = InteractionManager.runAfterInteractions(() => {
                setShouldRender(true);
            });

            return () => {
                // Cleanup: cancel the task if component unmounts
                task.cancel();
            };
        } else {
            // Reset when inactive
            setShouldRender(false);
        }
    }, [active]);

    // Show placeholder while waiting for interactions to complete
    if (!shouldRender) {
        return <>{placeholder}</>;
    }

    // Render actual content after interactions complete
    return <>{children}</>;
};
