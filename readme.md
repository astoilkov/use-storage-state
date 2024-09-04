# `use-storage-state`

> React hook for any [Storage](https://developer.mozilla.org/en-US/docs/Web/API/Storage) compatible API like `localStorage`, `sessionStorage`, or a custom one.

[![Gzipped Size](https://img.shields.io/bundlephobia/minzip/use-storage-state)](https://bundlephobia.com/result?p=use-storage-state)
[![Build Status](https://img.shields.io/github/actions/workflow/status/astoilkov/use-storage-state/main.yml?branch=main)](https://github.com/astoilkov/use-storage-state/actions/workflows/main.yml)

## Install

```bash
npm install use-storage-state
```

## Why

- SSR support.
- Works with React 19 and React 18 concurrent rendering.
- Handles the `Window` [`storage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event) event and updates changes across browser tabs, windows, and iframe's. Disable with `sync: false`.
- I also actively maintain [`use-local-storage-state`](https://github.com/astoilkov/use-local-storage-state) (400k downloads per month) for the past 4 years.
- Aiming for high-quality with [my open-source principles](https://astoilkov.com/my-open-source-principles).

## Usage

```typescript
import useStorageState from 'use-storage-state'

export default function Todos() {
    const [todos, setTodos] = useStorageState('todos', {
        defaultValue: ['buy avocado', 'do 50 push-ups']
    })
}
```

<details>
<summary>Todo list example</summary>
<p></p>

```tsx
import React, { useState } from 'react'
import useStorageState from 'use-storage-state'

export default function Todos() {
    const [todos, setTodos] = useStorageState('todos', {
        defaultValue: ['buy avocado']
    })
    const [query, setQuery] = useState('')

    function onClick() {
        setQuery('')
        setTodos([...todos, query])
    }

    return (
        <>
            <input value={query} onChange={e => setQuery(e.target.value)} />
            <button onClick={onClick}>Create</button>
            {todos.map(todo => (
                <div>{todo}</div>
            ))}
        </>
    )
}

```

</details>

<details>
<summary id="remove-item">Removing the data from <code>Storage</code> and resetting to the default</summary>
<p></p>

The `removeItem()` method will reset the value to its default and will remove the key from the `Storage`. It returns to the same state as when the hook was initially created.

```tsx
import useStorageState from 'use-storage-state'

export default function Todos() {
    const [todos, setTodos, removeItem] = useStorageState('todos', {
        defaultValue: ['buy avocado']
    })

    function onClick() {
        removeItem()
    }
}
```

</details>

<details>
<summary>Why my component renders twice?</summary>
<p></p>

If you are hydrating your component (for example, if you are using Next.js), your component might re-render twice. This is behavior specific to React and not to this library. It's caused by the `useSyncExternalStore()` hook. There is no workaround.

If you want to know if you are currently rendering the server value you can use this helper function:
```ts
function useIsServerRender() {
  return useSyncExternalStore(() => {
    return () => {}
  }, () => false, () => true)
}
```

</details>

## API

#### `useStorageState(key: string, options?: StorageStateOptions)`

Returns `[value, setValue, removeItem]` when called. The first two values are the same as `useState()`. The third value calls `Storage.removeItem()` and resets the hook to it's default state.

#### `key`

Type: `string`

The key used when calling `storage.setItem(key)` and `storage.getItem(key)`.

⚠️ Be careful with name conflicts as it is possible to access a property which is already in your storage that was created from another place in the codebase or in an old version of the application.

#### `options.defaultValue`

Type: `any`

Default: `undefined`

The default value. You can think of it as the same as `useState(defaultValue)`.

#### `options.storage`

Type: `"local" | "session" | Storage`

Default: `"local"`

You can set `localStorage`, `sessionStorage`, or other any [`Storage`](https://developer.mozilla.org/en-US/docs/Web/API/Storage) compatible class.

_Note:_ Prefer to use the `"local"` and `"session"` literals instead of `localStorage` or `sessionStorage` objects directly, as both can throw an error when accessed if user has configured the browser to not store any site data.

#### `options.memoryFallback`

Type: `boolean`

Default: `true`

If `localStorage` or `sessionStorage` throw an error when accessed (possible when the browser is configured to not store any site data on device), the library uses a memory storage fallback so at least it allows for the hook to be functional. You can disable this behavior by setting this option to `false`.

#### `options.sync`

Type: `boolean`

Default: `true`

Setting to `false` doesn't subscribe to the [Window storage event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event). If you set to `false`, updates won't be synchronized across tabs, windows and iframes.

#### `options.storeDefault`

Type: `boolean`

Default: `false`

Setting to `true` calls `storage.setItem()` for the default value so the default value is persisted in `Storage` after the first render of the hook.

#### `options.serializer`

Type: `{ stringify, parse }`

Default: `JSON`

JSON does not serialize `Date`, `Regex`, or `BigInt` data.  You can pass in [superjson](https://github.com/blitz-js/superjson) or other `JSON`-compatible serialization library for more advanced serialization.

#### `memoryStorage`

The library exports a `memoryStorage` object that's used when the `memoryFallback` option is set to `true` (the default).

```ts
import { memoryStorage } from 'use-storage-state'

memoryStorage.getItem(key)
memoryStorage.setItem(key, value)
memoryStorage.removeItem(key)
```

## Related

- [`use-local-storage-state`](https://github.com/astoilkov/use-local-storage-state) — Similar to this hook but for `localStorage` only.
- [`use-session-storage-state`](https://github.com/astoilkov/use-session-storage-state) — Similar to this hook but for `sessionStorage` only.
- [`local-db-storage`](https://github.com/astoilkov/local-db-storage) — Tiny wrapper around `IndexedDB` that mimics `localStorage` API.