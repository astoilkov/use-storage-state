import memoryStorage from "./memoryStorage.js";
import type { Dispatch, SetStateAction } from "react";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";

export type StorageStateOptions<T> = {
    defaultValue?: T | (() => T);
    storage?: "local" | "session" | StorageLike | undefined;
    memoryFallback?: boolean;
    sync?: boolean;
    storeDefault?: boolean;
    serializer?: {
        stringify: (value: unknown) => string;
        parse: (value: string) => unknown;
    };
};

// - `useStorageState()` return type
// - first two values are the same as `useState`
export type StorageState<T> = [
    state: T,
    setState: Dispatch<SetStateAction<T>>,
    removeItem: () => void,
];

interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

export default function useStorageState(
    key: string,
    options?: StorageStateOptions<undefined>,
): StorageState<unknown>;
export default function useStorageState<T>(
    key: string,
    options?: Omit<StorageStateOptions<T | undefined>, "defaultValue">,
): StorageState<T | undefined>;
export default function useStorageState<T>(
    key: string,
    options?: StorageStateOptions<T>,
): StorageState<T>;
export default function useStorageState<T = undefined>(
    key: string,
    options?: StorageStateOptions<T | undefined>,
): StorageState<T | undefined> {
    const serializer = options?.serializer;
    const [defaultValue] = useState(options?.defaultValue);
    const storageOption =
        options !== undefined && "storage" in options
            ? options.storage
            : "local";
    const storageObj =
        storageOption === "local"
            ? goodTry(() => localStorage)
            : storageOption === "session"
              ? goodTry(() => sessionStorage)
              : storageOption;
    const resolvedStorage =
        storageObj === undefined && options?.memoryFallback !== false
            ? memoryStorage
            : storageObj;
    return useStorage(
        key,
        defaultValue,
        resolvedStorage,
        options?.sync,
        options?.storeDefault,
        serializer?.parse,
        serializer?.stringify,
    );
}

function useStorage<T>(
    key: string,
    defaultValue: T | undefined,
    storage: StorageLike | undefined,
    sync: boolean = true,
    storeDefault: boolean = false,
    parse: (value: string) => unknown = parseJSON,
    stringify: (value: unknown) => string = JSON.stringify,
): StorageState<T | undefined> {
    // we keep the `parsed` value in a ref because `useSyncExternalStore` requires a cached version
    const storageItem = useRef<{
        string: string | null;
        parsed: T | undefined;
    }>({
        string: null,
        parsed: defaultValue,
    });

    const value = useSyncExternalStore(
        // useSyncExternalStore.subscribe
        useCallback(
            (onStoreChange) => {
                const onChange = (localKey: string): void => {
                    if (key === localKey) {
                        onStoreChange();
                    }
                };
                callbacks.add(onChange);
                return (): void => {
                    callbacks.delete(onChange);
                };
            },
            [key],
        ),

        // useSyncExternalStore.getSnapshot
        () => {
            const string =
                storage === undefined
                    ? null
                    : goodTry(() => storage.getItem(key)) ?? null;

            if (string !== storageItem.current.string) {
                let parsed: T | undefined;

                try {
                    parsed =
                        string === null ? defaultValue : (parse(string) as T);
                } catch {
                    parsed = defaultValue;
                }

                storageItem.current.parsed = parsed;
            }

            storageItem.current.string = string;

            // related issues:
            // - https://github.com/astoilkov/use-local-storage-state/issues/26
            // - https://github.com/astoilkov/use-storage-state/issues/1
            if (
                storeDefault &&
                string === null &&
                storage !== undefined &&
                defaultValue !== undefined
            ) {
                // reasons for `localStorage` to throw an error:
                // - maximum quota is exceeded
                // - under Mobile Safari (since iOS 5) when the user enters private mode
                //   `localStorage.setItem()` will throw
                // - trying to access localStorage object when cookies are disabled in Safari throws
                //   "SecurityError: The operation is insecure."
                // eslint-disable-next-line no-console
                goodTry(() => {
                    const string = stringify(defaultValue);
                    storage.setItem(key, string);
                    storageItem.current = { string, parsed: defaultValue };
                });
            }

            return storageItem.current.parsed;
        },

        // useSyncExternalStore.getServerSnapshot
        () => defaultValue,
    );

    const setState = useCallback(
        (newValue: SetStateAction<T | undefined>): void => {
            const value =
                newValue instanceof Function
                    ? newValue(storageItem.current.parsed)
                    : newValue;

            // reasons for `localStorage` to throw an error:
            // - maximum quota is exceeded
            // - under Mobile Safari (since iOS 5) when the user enters private mode
            //   `localStorage.setItem()` will throw
            // - trying to access `localStorage` object when cookies are disabled in Safari throws
            //   "SecurityError: The operation is insecure."
            goodTry(() => storage?.setItem(key, stringify(value)));

            triggerCallbacks(key);
        },
        [key, storage, stringify],
    );

    const removeItem = useCallback(() => {
        if (storage !== undefined) {
            goodTry(() => storage.removeItem(key));
            triggerCallbacks(key);
        }
    }, [key, storage]);

    // - syncs change across tabs, windows, iframes
    // - the `storage` event is called only in all tabs, windows, iframe's except the one that
    //   triggered the change
    useEffect(() => {
        if (!sync) {
            return undefined;
        }

        const onStorage = (e: StorageEvent): void => {
            if (e.key === key && e.storageArea === goodTry(() => storage)) {
                triggerCallbacks(key);
            }
        };

        window.addEventListener("storage", onStorage);

        return (): void => window.removeEventListener("storage", onStorage);
    }, [key, storage, sync]);

    return useMemo(
        () => [value, setState, removeItem],
        [value, setState, removeItem],
    );
}

// notifies all instances using the same `key` to update
const callbacks = new Set<(key: string) => void>();
function triggerCallbacks(key: string): void {
    for (const callback of [...callbacks]) {
        callback(key);
    }
}

// a wrapper for `JSON.parse()` that supports "undefined" value. otherwise,
// `JSON.parse(JSON.stringify(undefined))` returns the string "undefined" not the value `undefined`
function parseJSON(value: string): unknown {
    return value === "undefined" ? undefined : JSON.parse(value);
}

function goodTry<T>(tryFn: () => T): T | undefined {
    try {
        return tryFn();
    } catch {}
}
