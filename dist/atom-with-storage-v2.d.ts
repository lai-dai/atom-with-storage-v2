import { WritableAtom } from 'jotai';
import { RESET } from 'jotai/utils';

interface PersistedClient<DehydratedState = any> {
    timestamp: number;
    version: string;
    clientState: DehydratedState;
}
type Unsubscribe = () => void;
type SetStateActionWithReset<Value> = Value | typeof RESET | ((prev: Value) => Value | typeof RESET);
interface AsyncStorage<Value> {
    getItem: (key: string, initialValue: Value, version?: string, maxAge?: number) => PromiseLike<Value>;
    setItem: (key: string, newValue: Value, version?: string) => PromiseLike<void>;
    removeItem: (key: string) => PromiseLike<void>;
    clear: () => PromiseLike<void>;
    subscribe?: (key: string, callback: (value: Value) => void, initialValue: Value) => Unsubscribe;
}
interface SyncStorage<Value> {
    getItem: (key: string, initialValue: Value, version?: string, maxAge?: number) => Value;
    setItem: (key: string, newValue: Value, version?: string) => void;
    removeItem: (key: string) => void;
    clear: () => void;
    subscribe?: (key: string, callback: (value: Value) => void, initialValue: Value) => Unsubscribe;
}
interface AsyncStringStorage {
    getItem: (key: string) => PromiseLike<string | null>;
    setItem: (key: string, newValue: string) => PromiseLike<void>;
    removeItem: (key: string) => PromiseLike<void>;
    clear: () => PromiseLike<void>;
}
interface SyncStringStorage {
    getItem: (key: string) => string | null;
    setItem: (key: string, newValue: string) => void;
    removeItem: (key: string) => void;
    clear: () => void;
}
type JsonStorageOptions = {
    /**
     * How to serialize the data to storage.
     * @default `JSON.stringify`
     */
    serialize?: (persistedQuery?: PersistedClient) => string;
    /**
     * How to deserialize the data from storage.
     * @default `JSON.parse`
     */
    deserialize?: (cachedString: string) => PersistedClient;
};
declare function createJSONStorage<Value>(): SyncStorage<Value>;
declare function createJSONStorage<Value>(getStringStorage: () => AsyncStringStorage, options?: JsonStorageOptions): AsyncStorage<Value>;
declare function createJSONStorage<Value>(getStringStorage: () => SyncStringStorage, options?: JsonStorageOptions): SyncStorage<Value>;
type Options = {
    getOnInit?: boolean;
    /**
     * @default `0`
     */
    version?: string;
    /**
     * @default `1000 * 60 * 60 * 24`
     */
    maxAge?: number;
};
declare function atomWithStorageV2<Value>(key: string, initialValue: Value, storage: AsyncStorage<Value>, options?: Options): WritableAtom<Value | Promise<Value>, [
    SetStateActionWithReset<Value | Promise<Value>>
], Promise<void>>;
declare function atomWithStorageV2<Value>(key: string, initialValue: Value, storage?: SyncStorage<Value>, options?: Options): WritableAtom<Value, [SetStateActionWithReset<Value>], void>;

export { AsyncStorage, AsyncStringStorage, SyncStorage, SyncStringStorage, atomWithStorageV2, createJSONStorage };
