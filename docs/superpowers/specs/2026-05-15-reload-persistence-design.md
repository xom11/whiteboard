# Reload Persistence — Design Spec

**Ngày**: 2026-05-15
**Trạng thái**: Brainstorm xong, chờ implementation plan
**Tác giả**: Claude + xom11

## Mục tiêu

Khi user mở `hoctotbachkhoa.com/whiteboard` (route standalone), vẽ/ghi chú, rồi
reload trang (hoặc đóng/mở tab) — toàn bộ scene + ảnh paste + vị trí scroll/zoom
phải còn nguyên. Không yêu cầu login, không server, không sync. Hoàn toàn client-side.

Repo `@xom11/whiteboard` là:

1. **App độc lập** chạy ở /whiteboard — note cá nhân với persist mạnh.
2. **Thư viện** export `Whiteboard` component để repo khác (như `hoctotbachkhoa`)
   nhúng vào — repo đó sẽ tự xử lý sync teacher↔student qua LiveKit. Persist
   client-side ở đây **không** đảm nhận classroom sync.

## Phi mục tiêu

- Multi-tab live sync (1 user mở 2 tab cùng board).
- Server-side persistence / login / cloud.
- Migrate dữ liệu cũ từ repo `hoctotbachkhoa` cũ (chưa có user thật).
- Backward-compat với API cũ — solo project, chưa publish npm, được phép breaking change.

## Scope

### Bỏ đi (classroom logic)

Repo này không quản lý teacher/student/remote — chuyển cho consumer (hoctotbachkhoa).

| Bỏ | File / vị trí |
|---|---|
| Prop `role: 'teacher' \| 'student'` | `ExcalidrawWhiteboardView.tsx` |
| Prop `roomId` | nt |
| Prop `initialScene` | nt (thay bằng read từ storage) |
| Prop `remoteScene`, `remoteFiles` | nt |
| `useEffect` apply remote scene cho student | nt:236-259 |
| `viewModeEnabled = !isTeacher` | nt:419 (thay bằng `readOnly` prop) |
| Mọi conditional `isTeacher` | nt:121, 164, 237, 293... |
| `persistKey` opt-in flow | nt + `core/usePersist.ts` |
| Hook `usePersist` | thay bằng inline trong component + 2 store mới |

### Thêm vào

| Thêm | File |
|---|---|
| Component `Whiteboard` (rename + simplify) | `src/Whiteboard.tsx` (rename từ `ExcalidrawWhiteboardView.tsx`) |
| `sceneStore` — localStorage wrapper | `src/core/persistence/sceneStore.ts` |
| `fileStore` — IndexedDB wrapper | `src/core/persistence/fileStore.ts` |
| Dev dep `fake-indexeddb` | `package.json` |

## Public API

```ts
// src/index.ts
export {
  Whiteboard,
  type WhiteboardProps,
} from './Whiteboard';

export {
  pickSyncableAppState,        // export sẵn cho consumer (LiveKit) — đã gồm scroll/zoom
} from './serialize';

// types giữ nguyên — re-export Excalidraw types + SyncableAppState.
// pickSyncableAppState đã include scrollX/scrollY/zoom — không cần thêm type mới.
export {
  type ExcalidrawElement,
  type BinaryFiles,
  type ExcalidrawSceneSnapshot,
  type SyncableAppState,
} from './types';

// Stamps (giữ nguyên)
export {
  DEFAULT_STAMPS,
  type StampType,
  // ...
} from './stamp';
```

```ts
// Whiteboard props
export interface WhiteboardProps {
  /**
   * Storage key cho persist client-side.
   * - Scene (elements + appState) → localStorage['whiteboard:scene:'+storageKey]
   * - Files raster → IndexedDB 'whiteboard-files', index theo storageKey
   * - Default: 'default'
   * - Truyền `null` để TẮT persist (consumer kiểm soát state qua onApi)
   */
  storageKey?: string | null;

  /** View-only (Excalidraw viewModeEnabled). Default false. */
  readOnly?: boolean;

  /** Local edits → consumer broadcast. Optional. */
  onSceneChange?: (snap: ExcalidrawSceneSnapshot) => void;
  onFilesChange?: (files: BinaryFiles, newFileIds: string[]) => void;

  /** Excalidraw imperative API. Consumer dùng để inject remote scene từ LiveKit. */
  onApi?: (api: any) => void;

  /** Default 'vi-VN'. */
  langCode?: string;

  /** Default DEFAULT_STAMPS. */
  stamps?: ReadonlyArray<StampType>;
}
```

## Architecture

```
@xom11/whiteboard
├─ Whiteboard                  ← single component
├─ core/persistence/
│   ├─ sceneStore.ts           ← localStorage (sync, ~50KB scene JSON)
│   └─ fileStore.ts            ← IndexedDB (async, raster files)
├─ serialize.ts                ← pickSyncableAppState (giữ nguyên, đã có scroll/zoom)
└─ stamp/                      ← giữ nguyên (geometry + LaTeX + registry)
```

## Storage modules

### `sceneStore.ts` (localStorage)

```ts
const PREFIX = 'whiteboard:scene:';
const SCHEMA_VERSION = 1;

interface StoredScene {
  version: number;
  elements: readonly ExcalidrawElement[];
  appState: SyncableAppState;       // đã gồm scrollX, scrollY, zoom, theme...
  savedAt: number;
}

export function readScene(key: string): StoredScene | null;
export function writeScene(key: string, payload: { elements, appState }): void;
export function clearScene(key: string): void;
```

Validate khi đọc: `parsed.version === 1` và `Array.isArray(parsed.elements)`.
Mọi error → `console.warn` + return `null` / no-op write.

### `fileStore.ts` (IndexedDB)

```ts
const DB_NAME = 'whiteboard-files';
const DB_VERSION = 1;
const STORE = 'files';

interface FileRecord {
  id: string;              // PK = Excalidraw fileId
  storageKey: string;      // index
  dataURL: string;
  mimeType: string;
  created: number;
  savedAt: number;
}

export async function readFiles(storageKey: string): Promise<BinaryFiles>;
export async function writeFiles(storageKey: string, files: BinaryFiles): Promise<void>;
export async function pruneFiles(storageKey: string, keepIds: ReadonlySet<string>): Promise<void>;
export async function clearAll(storageKey: string): Promise<void>;
```

`writeFiles` chỉ ghi file id chưa có (Excalidraw `files` map cumulative).
Math-stamp files **không** vào fileStore — regenerate từ `customData` qua
`restoreMissingMathStampFiles` (đã có).

Open fail (private mode) → set `idbDisabled = true` module-local → mọi method
sau no-op gracefully.

## Data flow

### Mount

```
render()
  └─ persistedScene = useMemo(() => readScene(storageKey)) [sync]
  └─ <Excalidraw initialData={persistedScene}>
       └─ render scene ngay (raster ảnh hiện placeholder rect)

useEffect [api ready]
  ├─ readFiles(storageKey) [async ~100ms] → api.addFiles(records)
  └─ restoreMissingMathStampFiles(api, elements, stamps) → regen SVG
```

User thấy scene "pop in" tức thì; ảnh raster + stamp SVG xuất hiện ~100ms sau.

### Steady state (onChange)

```
onChange(elements, appState, files)
  ├─ setIsDarkTheme(appState.theme === 'dark')
  ├─ detect newFileIds → fire onFilesChange?
  │
  ├─ Throttle A [200ms]:
  │     liveElements = filter(!isDeleted)
  │     liveAppState = pickSyncableAppState(appState)
  │     if (storageKey) writeScene(key, { elements, appState })
  │     fire onSceneChange?
  │
  ├─ Throttle B [1000ms]:
  │     rasterFiles = filter(!isMathStamp)
  │     if (storageKey) writeFiles(key, rasterFiles)
  │
  └─ Throttle C [2000ms, edge-trigger sau B]:
        if (storageKey) pruneFiles(key, currentFileIds)
```

### `storageKey === null`

Mọi `if (storageKey)` guard skip → app vẫn chạy, không persist, chỉ fire callback.

## Error handling

| Lỗi | Xử lý |
|---|---|
| `localStorage.setItem` QuotaExceededError | try/catch + warn. Write sau có thể OK. |
| `JSON.parse` corrupt scene | catch + `clearScene(key)` + return null. |
| `version > SCHEMA_VERSION` | return null + warn. Forward-incompat by design. |
| `indexedDB.open()` reject | `idbDisabled=true` → mọi method no-op. App OK, mất raster khi reload. |
| IDB transaction abort | reject → catch + warn. Lần ghi sau retry. |
| File id thiếu trong store | Excalidraw default: placeholder rect. Không xử lý đặc biệt. |
| `api` chưa ready | useEffect guard `if (!api) return`. |

Nguyên tắc: persist subsystem không bao giờ break canvas. Mọi failure → warn + tiếp tục.

## Testing

Dev dep mới: `fake-indexeddb` (jest mock cho IndexedDB).

### Unit

`src/core/persistence/__tests__/sceneStore.test.ts`:
- roundtrip read/write/clear
- malformed JSON → null
- missing `version` → null
- `version` lớn hơn → null + warn
- quota error swallowed

`src/core/persistence/__tests__/fileStore.test.ts` (fake-indexeddb):
- roundtrip readFiles/writeFiles
- writeFiles skip id đã có
- pruneFiles giữ đúng keepIds, xoá phần còn lại
- clearAll xoá toàn bộ records của storageKey, không đụng records của storageKey khác
- open() reject → tất cả method no-op không crash

### Component

`src/__tests__/Whiteboard.test.tsx`:
- smoke mount với Excalidraw mock
- pre-seed localStorage → mount → Excalidraw nhận `initialData.elements`
- simulate `onChange` → sau 250ms `sceneStore.writeScene` được gọi
- `storageKey={null}` → không read/write
- `readOnly={true}` → Excalidraw nhận `viewModeEnabled={true}`
- new fileId (raster) → sau 1100ms `fileStore.writeFiles` được gọi
- new fileId của math-stamp → KHÔNG vào `writeFiles`

### Out of scope task này

- Playwright E2E load /whiteboard, draw, reload, assert
- Cross-browser quota stress test
- Migration tool (chưa có user data cũ)

## Implementation order (preview)

Phần `writing-plans` skill sẽ chi tiết — đại khái:

1. Tạo `sceneStore` + `fileStore` + tests
2. Rename `ExcalidrawWhiteboardView` → `Whiteboard`, xoá role/remote* code paths
3. Wire 2 store vào `Whiteboard`, xoá hook `usePersist` cũ
4. Update `src/index.ts` exports
5. Update tests cũ (smoke + behavior) cho API mới
6. Build, smoke-test bằng standalone test page

## Acceptance criteria

- [ ] `<Whiteboard />` render ở route /whiteboard của consumer hoctotbachkhoa.
- [ ] Vẽ stroke + paste 1 ảnh + chèn 1 geometry stamp + 1 LaTeX stamp.
- [ ] Pan + zoom canvas tới góc cụ thể.
- [ ] Đổi sang dark theme.
- [ ] Reload trang → tất cả còn nguyên (stroke, ảnh, stamps, view position, theme).
- [ ] Đóng tab, mở lại → tất cả còn nguyên.
- [ ] `<Whiteboard storageKey={null} />` không touch localStorage / IDB (devtools verify).
- [ ] Test suite pass: unit (sceneStore + fileStore) + component (Whiteboard).
- [ ] `npm run typecheck` clean.
- [ ] `npm run build` clean, `dist/Whiteboard.{js,mjs}` có `"use client"` prefix.

## Câu hỏi mở (không block design, làm sau khi cần)

- Cleanup UI: nếu user muốn "new board" / "clear all", thêm menu item trong
  Excalidraw MainMenu gọi `clearScene + clearAll`.
- Multiple boards: hiện tại 1 board / storageKey. Nếu sau này muốn list/switch
  board, cần index riêng (`whiteboard:boards`).
- Export/import: serialize board → file để user backup. Có thể tận dụng
  Excalidraw built-in export.
- Multi-tab conflict: 2 tab cùng storageKey → tab nào ghi sau thắng (silent
  overwrite). OK với note solo, không sửa.
