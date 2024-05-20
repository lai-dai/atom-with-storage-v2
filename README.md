# atomWithStorageV2

## Install

```
npm i github:lai-dai/atom-with-storage-v2
```

## Usage

```js
import { atomWithStorageV2, createJSONStorage } from "@lai-dai/atom-with-storage-v2";
import lzString from 'lz-string'

const compressLZW = (data: Record<string, any> | string) => {
  if (typeof data === 'object') {
    return lzString.compressToEncodedURIComponent(JSON.stringify(data))
  }

  return lzString.compressToEncodedURIComponent(data)
}

const decompressLZW = (compressed: string) =>
  lzString.decompressFromEncodedURIComponent(compressed)

export const atomStorage = createJSONStorage<any>(
  () =>
    (typeof window !== 'undefined' ? window.localStorage : undefined) as any,
  {
    serialize: (data) => compressLZW(JSON.stringify(data)),
    deserialize: (data) => JSON.parse(decompressLZW(data)),
  }
)

const sessionAtom = atomWithStorageV2(
  "offline_cache",
  "foo",
  atomStorage as any,
  { getOnInit: true }
);
```
