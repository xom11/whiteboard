# Phase 2.2-2.3 - AI Editor UX + Eval Harness

**Status:** Approved by user 2026-05-26 through the instruction to auto-accept the best implementation choice.
**Builds on:** Phase 2.0 DSL/transpiler (v0.23.0) and Phase 2.1 Claude call layer (v0.24.0).
**Related issues:** #40. The reverse serializer is tracked separately in #41.

---

## Muc tieu

1. Cho phep consumer bat UI "Dung bang AI" trong editor hinh hoc 2D bang mot callback an toan cho browser.
2. Quan ly prompt/loading/error trong React hook rieng va nap State AI sinh ra vao `MiniBoard`/scene store.
3. Them eval harness 24 de hinh hoc mau va smoke script de kiem tra API that bang `ANTHROPIC_API_KEY`.

## Rang buoc kien truc

`generateFigure()` cua Phase 2.1 la call layer server-side vi can API key. `EditorPanel` la Client Component. Vi vay editor **khong** import/goi SDK va **khong** doc bien moi truong API key. Consumer truyen callback `generateGeometryFigure` tu boundary cua ung dung (API route/fetch wrapper hoac Server Action phu hop).

Callback UI chi can hop dong toi thieu:

```ts
export type AiFigureUiResult =
  | { ok: true; state: State }
  | { ok: false; message: string };

export type GenerateGeometryFigure = (
  problem: string,
  options: { signal: AbortSignal },
) => Promise<AiFigureUiResult>;
```

Ket qua day du tu `generateFigure()` tuong thich ve cau truc voi hop dong nay; consumer co the wrap de giu key o server.

## Phase 2.2 - UX

### API va data flow

- Them optional prop `generateGeometryFigure?: GenerateGeometryFigure` vao `WhiteboardProps` va `StampHostProps`.
- `Whiteboard` forward prop toi active host; chi `GeometryStampHost` su dung va truyen toi `GeometryEditorPanel`.
- Tao `editor/useAiFigure.ts` quan ly `prompt`, `isLoading`, `error`, submit va `AbortController`.
- Editor chi render form AI neu callback duoc cau hinh; khong hien control bi vo nghia cho consumer chua bat AI.

### Hanh vi UI

- Textarea nhan de tieng Viet, submit qua nut `Dung bang AI`.
- Prompt rong bi chan voi loi noi bo, khong goi callback.
- Khi dang doi: nut disabled va hien `Dang dung...`.
- Loi callback, ket qua tu choi/khong hop le, hoac exception duoc hien bang `role="alert"`.
- Submit moi huy request cu; unmount huy request dang cho.

### Nap state

Khi generate thanh cong, editor dispatch mot action `LOAD` vao store hien tai. State AI thay toan bo danh sach object thay vi merge, de khong va cham ID hoac tao hinh lai nua vo tinh. `meta` cua store dang mo duoc giu lai de khong reset viewport/truc/luoi cua nguoi dung. `LOAD` van tao mot moc undo thong thuong, nen user co the hoan tac figure AI.

## Phase 2.3 - Eval va smoke

### Corpus

Dat du lieu eval o `scripts/ai-eval-cases.ts`: 24 de THCS/lop 10 gom tam giac co ban, duong cao/trung tuyen/tam, duong tron/tiep tuyen, tu giac va cac truong hop giao diem. Moi case co labels/kinds bat buoc de cham ket qua State mot cach deterministic.

### Harness

- `scripts/ai-eval-lib.ts` chua corpus va ham cham diem thuần, co unit tests khong can network.
- `scripts/eval-ai.ts` goi `generateFigure()` tuan tu, bao cao PASS/FAIL va tong token; nhan `--limit`/`--model`.
- `scripts/smoke-ai.ts` goi mot de mac dinh hoac prompt CLI, in tom tat State/usage va thoat khac 0 neu API hoac transpiler loi.
- Hai script yeu cau `ANTHROPIC_API_KEY` tai runtime; khong key nao vao bundle client hoac log.

`tsx` duoc dung de chay TypeScript script tu source:

```bash
ANTHROPIC_API_KEY=... npm run ai:smoke
ANTHROPIC_API_KEY=... npm run ai:eval -- --limit 5
```

## Testing

- Hook tests: empty prompt, success, failure, loading va stale/unmount abort.
- Editor tests: render conditional, submit UI, `LOAD` state thanh cong va giu `meta`.
- Eval lib tests: corpus 20-30 cases va scoring cho success/failure.
- Verification: Jest lien quan, `npm run typecheck`, `npm run build`; smoke API that chi chay neu environment co key.

## Ngoai pham vi

State -> DSL reverse serializer cho tab `Doi tuong` khong duoc ghep vao Phase 2.2/2.3. No can mapping khong mat du lieu tu moi `SceneObject` sang DSL, quy tac cho object thu cong/ngoai DSL, va UX hien thi rieng; se duoc theo doi bang issue doc lap.
