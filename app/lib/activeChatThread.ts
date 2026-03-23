let activeThreadId: string | null = null;

export const setActiveThreadId = (threadId: string | null) => {
  activeThreadId = threadId;
};

export const getActiveThreadId = () => activeThreadId;
