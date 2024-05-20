"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  atomWithStorageV2: () => atomWithStorageV2,
  createJSONStorage: () => createJSONStorage2
});
module.exports = __toCommonJS(src_exports);

// node_modules/jotai/esm/vanilla.mjs
var import_meta = {};
var keyCount = 0;
function atom(read, write) {
  const key = `atom${++keyCount}`;
  const config = {
    toString: () => key
  };
  if (typeof read === "function") {
    config.read = read;
  } else {
    config.init = read;
    config.read = defaultRead;
    config.write = defaultWrite;
  }
  if (write) {
    config.write = write;
  }
  return config;
}
function defaultRead(get) {
  return get(this);
}
function defaultWrite(get, set, arg) {
  return set(
    this,
    typeof arg === "function" ? arg(get(this)) : arg
  );
}
Symbol(
  (import_meta.env ? import_meta.env.MODE : void 0) !== "production" ? "CONTINUE_PROMISE" : ""
);

// node_modules/jotai/esm/vanilla/utils.mjs
var import_meta2 = {};
var RESET = Symbol(
  (import_meta2.env ? import_meta2.env.MODE : void 0) !== "production" ? "RESET" : ""
);
var isPromiseLike = (x) => typeof (x == null ? void 0 : x.then) === "function";
function createJSONStorage(getStringStorage = () => {
  try {
    return window.localStorage;
  } catch (e) {
    if ((import_meta2.env ? import_meta2.env.MODE : void 0) !== "production") {
      if (typeof window !== "undefined") {
        console.warn(e);
      }
    }
    return void 0;
  }
}, options) {
  let lastStr;
  let lastValue;
  const storage = {
    getItem: (key, initialValue) => {
      var _a, _b;
      const parse = (str2) => {
        str2 = str2 || "";
        if (lastStr !== str2) {
          try {
            lastValue = JSON.parse(str2, options == null ? void 0 : options.reviver);
          } catch (e) {
            return initialValue;
          }
          lastStr = str2;
        }
        return lastValue;
      };
      const str = (_b = (_a = getStringStorage()) == null ? void 0 : _a.getItem(key)) != null ? _b : null;
      if (isPromiseLike(str)) {
        return str.then(parse);
      }
      return parse(str);
    },
    setItem: (key, newValue) => {
      var _a;
      return (_a = getStringStorage()) == null ? void 0 : _a.setItem(
        key,
        JSON.stringify(newValue, options == null ? void 0 : options.replacer)
      );
    },
    removeItem: (key) => {
      var _a;
      return (_a = getStringStorage()) == null ? void 0 : _a.removeItem(key);
    }
  };
  if (typeof window !== "undefined" && typeof window.addEventListener === "function" && window.Storage) {
    storage.subscribe = (key, callback, initialValue) => {
      if (!(getStringStorage() instanceof window.Storage)) {
        return () => {
        };
      }
      const storageEventCallback = (e) => {
        if (e.storageArea === getStringStorage() && e.key === key) {
          let newValue;
          try {
            newValue = JSON.parse(e.newValue || "");
          } catch (e2) {
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
var defaultStorage = createJSONStorage();

// src/atom-with-storage-v2.ts
var isPromiseLike2 = (x) => typeof x?.then === "function";
function createJSONStorage2(getStringStorage = () => {
  try {
    return window.localStorage;
  } catch (e) {
    return void 0;
  }
}, {
  serialize = JSON.stringify,
  deserialize = JSON.parse
} = {}) {
  let lastStr;
  let lastValue;
  const storage = {
    getItem: (key, initialValue, version = "0", maxAge = 1e3 * 60 * 60 * 24) => {
      const parse = (str2) => {
        str2 = str2 || "";
        if (lastStr !== str2) {
          try {
            const persistedClient = deserialize(str2);
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
          lastStr = str2;
        }
        return lastValue;
      };
      const str = getStringStorage()?.getItem(key) ?? null;
      if (isPromiseLike2(str)) {
        return str.then(parse);
      }
      return parse(str);
    },
    setItem: (key, newValue, version = "0") => {
      const persistedClient = {
        timestamp: Date.now(),
        version,
        clientState: newValue
      };
      return getStringStorage()?.setItem(key, serialize(persistedClient));
    },
    removeItem: (key) => getStringStorage()?.removeItem(key),
    clear: () => getStringStorage()?.clear()
  };
  if (typeof window !== "undefined" && typeof window.addEventListener === "function" && window.Storage) {
    storage.subscribe = (key, callback, initialValue) => {
      if (!(getStringStorage() instanceof window.Storage)) {
        return () => {
        };
      }
      const storageEventCallback = (e) => {
        if (e.storageArea === getStringStorage() && e.key === key) {
          let newValue;
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
var defaultStorage2 = createJSONStorage2();
function atomWithStorageV2(key, initialValue, storage = defaultStorage2, options) {
  const getOnInit = options?.getOnInit;
  const baseAtom = atom(
    getOnInit ? storage.getItem(key, initialValue) : initialValue
  );
  baseAtom.onMount = (setAtom) => {
    setAtom(storage.getItem(key, initialValue));
    let unsub;
    if (storage.subscribe) {
      unsub = storage.subscribe(key, setAtom, initialValue);
    }
    return unsub;
  };
  const anAtom = atom(
    (get) => get(baseAtom),
    (get, set, update) => {
      const nextValue = typeof update === "function" ? update(get(baseAtom)) : update;
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
  return anAtom;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  atomWithStorageV2,
  createJSONStorage
});
//# sourceMappingURL=index.js.map