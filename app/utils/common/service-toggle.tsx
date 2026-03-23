// hooks/useToggleList.ts
import { useCallback, useState } from 'react';
import { toggleInArray } from './toggle-array';


export function useToggleList<T>(initial: T[] = []) {
    const [list, setList] = useState<T[]>(initial);

    const toggle = useCallback((item: T) => {
        setList(prev => toggleInArray(prev, item));
    }, []);

    const set = useCallback((items: T[]) => setList(items), []);

    const clear = useCallback(() => setList([]), []);

    const has = useCallback((item: T) => list.includes(item), [list]);

    return { list, toggle, set, clear, has };
}
