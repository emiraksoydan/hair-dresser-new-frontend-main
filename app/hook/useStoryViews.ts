import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'social:viewedStoryIds';

export function useStoryViews() {
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const arr = JSON.parse(raw) as string[];
          setViewedIds(new Set(arr));
        } catch {
          /* ignore */
        }
      })
      .finally(() => setReady(true));
  }, []);

  const markViewed = useCallback(async (storyIds: string[]) => {
    if (!storyIds.length) return;
    setViewedIds((prev) => {
      const next = new Set(prev);
      storyIds.forEach((id) => next.add(id));
      AsyncStorage.setItem(KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const isGroupUnviewed = useCallback(
    (storyIds: string[]) => storyIds.some((id) => !viewedIds.has(id)),
    [viewedIds],
  );

  return { ready, viewedIds, markViewed, isGroupUnviewed };
}
