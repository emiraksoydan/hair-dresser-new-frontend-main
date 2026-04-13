import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react';

interface NotificationOpenerContextValue {
  registerOpenNotifications: (fn: () => void) => void;
  openNotifications: () => void;
}

const NotificationOpenerContext = createContext<NotificationOpenerContextValue>({
  registerOpenNotifications: () => {},
  openNotifications: () => {},
});

export const NotificationOpenerProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const openRef = useRef<(() => void) | null>(null);

  const registerOpenNotifications = useCallback((fn: () => void) => {
    openRef.current = fn;
  }, []);

  const openNotifications = useCallback(() => {
    openRef.current?.();
  }, []);

  const value = useMemo<NotificationOpenerContextValue>(
    () => ({ registerOpenNotifications, openNotifications }),
    [registerOpenNotifications, openNotifications]
  );

  return (
    <NotificationOpenerContext.Provider value={value}>
      {children}
    </NotificationOpenerContext.Provider>
  );
};

export const useNotificationOpener = () => useContext(NotificationOpenerContext);
