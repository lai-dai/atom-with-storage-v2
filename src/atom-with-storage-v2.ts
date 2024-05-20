import { atom } from "jotai";
import type { WritableAtom } from "jotai";
import { RESET } from "jotai/utils";

interface PersistedClient<DehydratedState = any> {
  timestamp: number;
  version: string;
  clientState: DehydratedState;
}

const isPromiseLike = (x: unknown): x is PromiseLike<unknown> =>
  typeof (x as any)?.then === "function";

type Unsubscribe = () => void;

type SetStateActionWithReset<Value> =
  | Value
  | typeof RESET
  | ((prev: Value) => Value | typeof RESET);

export interface AsyncStorage<Value> {
  getItem: (
    key: string,
    initialValue: Value,
    version?: string,
    maxAge?: number
  ) => PromiseLike<Value>;
  setItem: (
    key: string,
    newValue: Value,
    version?: string
  ) => PromiseLike<void>;
  removeItem: (key: string) => PromiseLike<void>;
  clear: () => PromiseLike<void>;
  subscribe?: (
    key: string,
    callback: (value: Value) => void,
    initialValue: Value
  ) => Unsubscribe;
}

export interface SyncStorage<Value> {
  getItem: (
    key: string,
    initialValue: Value,
    version?: string,
    maxAge?: number
  ) => Value;
  setItem: (key: string, newValue: Value, version?: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  subscribe?: (
    key: string,
    callback: (value: Value) => void,
    initialValue: Value
  ) => Unsubscribe;
}

export interface AsyncStringStorage {
  getItem: (key: string) => PromiseLike<string | null>;
  setItem: (key: string, newValue: string) => PromiseLike<void>;
  removeItem: (key: string) => PromiseLike<void>;
  clear: () => PromiseLike<void>;
}

export interface SyncStringStorage {
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

export function createJSONStorage<Value>(): SyncStorage<Value>;

export function createJSONStorage<Value>(
  getStringStorage: () => AsyncStringStorage,
  options?: JsonStorageOptions
): AsyncStorage<Value>;

export function createJSONStorage<Value>(
  getStringStorage: () => SyncStringStorage,
  options?: JsonStorageOptions
): SyncStorage<Value>;

export function createJSONStorage<Value>(
  getStringStorage: () =>
    | AsyncStringStorage
    | SyncStringStorage
    | undefined = () => {
    try {
      return window.localStorage;
    } catch (e) {
      return undefined;
    }
  },
  {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  }: JsonStorageOptions = {}
): AsyncStorage<Value> | SyncStorage<Value> {
  let lastStr: string | undefined;
  let lastValue: Value;
  const storage: AsyncStorage<Value> | SyncStorage<Value> = {
    getItem: (
      key,
      initialValue,
      version = "0",
      maxAge = 1000 * 60 * 60 * 24
    ) => {
      const parse = (str: string | null) => {
        str = str || "";
        if (lastStr !== str) {
          try {
            const persistedClient = deserialize(str);

            if (persistedClient) {
              if (persistedClient.timestamp) {
                const expired = Date.now() - persistedClient.timestamp > maxAge;

                if (expired || persistedClient.version !== version) {
                  storage.removeItem(key);
                  throw new Error("expired or other version");
                } else {
                  lastValue = persistedClient.clientState;
                }
              } else {
                storage.removeItem(key);
                throw new Error("is empty");
              }
            }
          } catch {
            return initialValue;
          }
          lastStr = str;
        }
        return lastValue;
      };
      const str = getStringStorage()?.getItem(key) ?? null;
      if (isPromiseLike(str)) {
        return str.then(parse) as never;
      }
      return parse(str) as never;
    },
    setItem: (key, newValue, version = "0") => {
      const persistedClient: PersistedClient = {
        timestamp: Date.now(),
        version,
        clientState: newValue,
      };
      return getStringStorage()?.setItem(key, serialize(persistedClient));
    },
    removeItem: (key) => getStringStorage()?.removeItem(key),
    clear: () => getStringStorage()?.clear(),
  };
  if (
    typeof window !== "undefined" &&
    typeof window.addEventListener === "function" &&
    window.Storage
  ) {
    storage.subscribe = (key, callback, initialValue) => {
      if (!(getStringStorage() instanceof window.Storage)) {
        return () => {};
      }
      const storageEventCallback = (e: StorageEvent) => {
        if (e.storageArea === getStringStorage() && e.key === key) {
          let newValue: Value;
          try {
            newValue = JSON.parse(e.newValue || "");
          } catch {
            newValue = initialValue;
          }
          callback(newValue);
        }
      };
      window.addEventListener("storage", storageEventCallback);
      return () => {
        window.removeEventListener("storage", storageEventCallback);
      };
    };
  }
  return storage;
}

const defaultStorage = createJSONStorage();

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

export function atomWithStorageV2<Value>(
  key: string,
  initialValue: Value,
  storage: AsyncStorage<Value>,
  options?: Options
): WritableAtom<
  Value | Promise<Value>,
  [SetStateActionWithReset<Value | Promise<Value>>],
  Promise<void>
>;

export function atomWithStorageV2<Value>(
  key: string,
  initialValue: Value,
  storage?: SyncStorage<Value>,
  options?: Options
): WritableAtom<Value, [SetStateActionWithReset<Value>], void>;

export function atomWithStorageV2<Value>(
  key: string,
  initialValue: Value,
  storage:
    | SyncStorage<Value>
    | AsyncStorage<Value> = defaultStorage as SyncStorage<Value>,
  options?: Options
) {
  const getOnInit = options?.getOnInit;
  const baseAtom = atom(
    getOnInit
      ? (storage.getItem(key, initialValue) as Value | Promise<Value>)
      : initialValue
  );

  baseAtom.onMount = (setAtom) => {
    setAtom(storage.getItem(key, initialValue) as Value | Promise<Value>);
    let unsub: Unsubscribe | undefined;
    if (storage.subscribe) {
      unsub = storage.subscribe(key, setAtom, initialValue);
    }
    return unsub;
  };

  const anAtom = atom(
    (get) => get(baseAtom),
    (get, set, update: SetStateActionWithReset<Value | Promise<Value>>) => {
      const nextValue =
        typeof update === "function"
          ? (
              update as (
                prev: Value | Promise<Value>
              ) => Value | Promise<Value> | typeof RESET
            )(get(baseAtom))
          : update;
      if (nextValue === RESET) {
        set(baseAtom, initialValue);
        return storage.removeItem(key);
      }
      if (nextValue instanceof Promise) {
        return nextValue.then((resolvedValue) => {
          set(baseAtom, resolvedValue);
          return storage.setItem(key, resolvedValue);
        });
      }
      set(baseAtom, nextValue);
      return storage.setItem(key, nextValue);
    }
  );

  return anAtom as never;
}
