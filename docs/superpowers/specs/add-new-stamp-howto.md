# How-to: Thêm 1 stamp mới vào `@xom11/whiteboard`

**Audience:** dev fork repo / contributor.
**Đầu ra:** stamp mới có toolbar, shortcut, persist/restore, pass contract suite.
**Thời gian mục tiêu:** ≤ 30 phút từ lúc copy template.
**Tier:** B½.3 (issue #29) — bundle với [STAMP_CATALOG](../../../src/stamps/shared/catalog.ts) +
[contract suite](../../../src/stamps/shared/__tests__/stamp-contract.ts).

---

## 6 bước

### 1. Copy template

```bash
cp -r examples/stamp-template src/stamps/<your-kind>
```

`<your-kind>` là kebab-case (vd `sticky-note`, `chart-pie`). Thư mục mới chứa:

```
src/stamps/<your-kind>/
├── index.tsx           ← StampType definition
├── types.ts            ← Custom data + type guard
├── render.ts           ← renderSvgFromCustomData
├── host.tsx            ← Host component (forwardRef)
└── __tests__/
    └── contract.test.ts
```

### 2. Đổi `kind` + custom data

Trong `types.ts`:

```ts
export interface YourCustomData extends BaseStampCustomData {
  kind: 'your-kind';   // ← phải khớp với stamp.kind
  version: 1;
  // ... fields riêng (vd `text: string`, `coords: number[]`).
}

export function isYourCustomData(data: unknown): data is YourCustomData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<YourCustomData>;
  return d.kind === 'your-kind' && d.version === 1 /* && các check khác */;
}
```

Update import path: `../../src/stamps/shared/types` → `../shared/types` (vì file giờ
nằm trong `src/stamps/` rồi).

### 3. Implement `render.ts`

`renderSvgFromCustomData` chạy ở 2 chỗ:
1. **Insert lần đầu**: Host gọi sau khi user xác nhận editor.
2. **Restore sau reload**: `restoreMissingStampFiles` regenerate file SVG vì Excalidraw
   không persist binary payload.

Yêu cầu: trả về **SVG string** với root `<svg xmlns="http://www.w3.org/2000/svg" ...>`.
Luôn dùng light palette — Excalidraw tự đảo trong dark mode.

```ts
export async function renderYourSvg(/* ...fields */): Promise<string> {
  // Có thể dùng async (vd dynamic import JSXGraph/KaTeX/...).
  return '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">...</svg>';
}
```

### 4. Implement `host.tsx`

Host component bọc UI editor + insert. Bắt buộc forwardRef với handle
`{tryInsert(): boolean, hasContent(): boolean}`:

```tsx
export const YourHost = forwardRef<StampHostHandle, StampHostProps>(
  function YourHost({ api, editingElement, onClose }, ref) {
    // Restore state từ editingElement nếu re-edit (double-click).
    const initial = useMemo(() => {
      if (editingElement && isYourCustomData(editingElement.customData)) {
        return editingElement.customData;
      }
      return /* default state */;
    }, [editingElement]);

    const handleInsert = useCallback(async () => {
      const svgString = await renderYourSvg(/* ... */);
      await insertStampImage(api, {
        svgString,
        makeCustomData: () => ({ kind: 'your-kind', version: 1, /* ... */ }),
        editingElementId: editingElement?.id ?? null,
      });
      onClose();
    }, [api, editingElement?.id, onClose]);

    useImperativeHandle(ref, () => ({
      tryInsert: () => { void handleInsert(); return true; },
      hasContent: () => /* check state */,
    }), [handleInsert]);

    return <div>{/* editor UI */}</div>;
  },
);
```

Trong `index.tsx`, lazy-load Host:

```tsx
const YourHost = lazy(() => import('./host').then((m) => ({ default: m.YourHost })));

export const yourStamp: StampType<YourCustomData> = {
  kind: 'your-kind',
  shortcutKey: 'k',         // 1 ký tự lowercase, không trùng stamp khác
  toolbarLabel: 'K',
  toolbarTitle: 'Chèn <your-kind> (K)',
  toolbarIcon: <svg>...</svg>,
  matchesCustomData: isYourCustomData,
  renderSvgFromCustomData: async (data) => { /* ... */ },
  restoreFileFromCustomData: async (element) => { /* ... */ },
  Host: YourHost,
};
```

### 5. Đăng ký vào registry + catalog

**`src/stamps/shared/registry.ts`** — thêm stamp vào `STABLE_STAMPS` (production-ready)
hoặc `EXPERIMENTAL_STAMPS` (chưa stable):

```ts
import { yourStamp } from '../your-kind';

export const EXPERIMENTAL_STAMPS: ReadonlyArray<StampType> = Object.freeze([
  geometry3dStamp,
  graph2dStamp,
  yourStamp,    // ← thêm vào đây
]);

export { yourStamp, type YourCustomData } from '../your-kind';
```

**`src/stamps/shared/catalog.ts`** — thêm entry vào `STAMP_CATALOG`:

```ts
{
  id: 'your-kind',
  title: 'Mô tả ngắn (vd "Sticky note")',
  version: 1,
  experimental: true,    // false nếu stable
  runtimeDeps: [],        // ['jsxgraph'] nếu cần
  bundleSize: { js: 0, css: 0 },   // sẽ override bởi build-catalog.mjs
},
```

**`scripts/build-catalog.mjs`** — thêm mapping nếu stamp có entry tsup riêng:

```js
const STAMP_FILE_MAP = {
  // ...
  'your-kind': 'your-kind',  // ← khớp `entry` trong tsup.config.ts
};
```

Và `tsup.config.ts`:

```ts
entry: {
  // ...
  'your-kind': 'src/stamps/your-kind/index.tsx',
},
```

### 6. Contract test

Template đã có file `contract.test.ts` — chỉ đổi import + fixture:

```ts
import { runStampContract } from '../../shared/__tests__/stamp-contract';
import { yourStamp } from '../index';
import type { YourCustomData } from '../types';

const validCustomData: YourCustomData = { kind: 'your-kind', version: 1, /* ... */ };

runStampContract(yourStamp, {
  validCustomData,
  sampleElement: { id: 'el-1', fileId: 'f1', customData: validCustomData },
  extraInvalid: [
    { kind: 'your-kind', version: 1 },         // thiếu field bắt buộc
    { kind: 'your-kind', version: 99 },        // version sai
  ],
});
```

Chạy:

```bash
npx jest --testPathPattern='your-kind'
```

Pass → done.

---

## Acceptance checklist

Trước khi PR:

- [ ] `npm test` xanh (4 stamps cũ + stamp mới đều pass contract suite).
- [ ] `npm run typecheck` xanh.
- [ ] `npm run lint` 0 errors trên file mới.
- [ ] `npm run build` xanh — `dist/<your-kind>.mjs` có mặt.
- [ ] `dist/catalog.json` có entry mới + `bundleSize.js > 0`.
- [ ] Manual smoke: chạy demo (`npm run demo`), kích shortcut → editor mở → insert →
      ảnh xuất hiện → reload page → ảnh vẫn còn → double-click → editor mở lại với
      state cũ.

## Liên quan

- Contract suite: [`src/stamps/shared/__tests__/stamp-contract.ts`](../../../src/stamps/shared/__tests__/stamp-contract.ts).
- Catalog: [`src/stamps/shared/catalog.ts`](../../../src/stamps/shared/catalog.ts).
- Build script: [`scripts/build-catalog.mjs`](../../../scripts/build-catalog.mjs).
- Template: [`examples/stamp-template/`](../../../examples/stamp-template/).
- ADR Tier B½: [issue #29](https://github.com/xom11/whiteboard/issues/29).
