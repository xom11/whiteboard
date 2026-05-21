// src/stamps/shared/__tests__/stamp-contract.ts
//
// Generic contract suite cho mọi StampType<T>. Mỗi stamp đăng ký 1 fixture
// (sample customData hợp lệ + foreign shapes) và gọi runStampContract để
// đảm bảo bám đúng public API của StampType (B½.2 — Tier B half, issue #29).
//
// Mục tiêu: fork repo viết stamp mới phải pass suite trước khi merge — tránh
// silent break (matchesCustomData wrong kind, renderSvgFromCustomData không
// trả về SVG, Host component thiếu forwardRef, restore file thất bại).
//
// Suite này KHÔNG phải file .test.* — không chạy độc lập; mỗi stamp có
// `contract.test.ts` import và gọi `runStampContract(stamp, fixture)`.

import type { BaseStampCustomData, StampType } from '../types';

export interface StampContractFixture<T extends BaseStampCustomData> {
  /** customData hợp lệ — sample tối thiểu mà stamp chấp nhận. */
  validCustomData: T;
  /**
   * Element giả lập (chứa fileId + customData) để test restoreFileFromCustomData.
   * Nếu stamp không impl restoreFileFromCustomData, set `skipRestoreFile: true`.
   */
  sampleElement?: { id: string; fileId: string; customData: T };
  /** Skip render SVG test (vd stamp đang dev). Mặc định false. */
  skipSvgRender?: boolean;
  /** Skip restore-file test. Mặc định false nếu sampleElement có. */
  skipRestoreFile?: boolean;
  /**
   * Custom-data invalid bổ sung — vd phiên bản cũ stamp đã reject (graph-2d
   * v1, geometry-3d v3...). Suite mặc định đã test các edge case chung
   * (null/undefined/empty/other-kind).
   */
  extraInvalid?: unknown[];
}

export function runStampContract<T extends BaseStampCustomData>(
  stamp: StampType<T>,
  fixture: StampContractFixture<T>,
): void {
  describe(`Stamp contract: ${stamp.kind}`, () => {
    describe('metadata', () => {
      it('kind là string non-empty', () => {
        expect(typeof stamp.kind).toBe('string');
        expect(stamp.kind.length).toBeGreaterThan(0);
      });

      it('shortcutKey là 1 ký tự lowercase a-z', () => {
        expect(stamp.shortcutKey).toMatch(/^[a-z]$/);
      });

      it('toolbarLabel/toolbarTitle là string non-empty', () => {
        expect(typeof stamp.toolbarLabel).toBe('string');
        expect(stamp.toolbarLabel.length).toBeGreaterThan(0);
        expect(typeof stamp.toolbarTitle).toBe('string');
        expect(stamp.toolbarTitle.length).toBeGreaterThan(0);
      });

      it('toolbarIcon được khai báo', () => {
        expect(stamp.toolbarIcon).toBeDefined();
        expect(stamp.toolbarIcon).not.toBeNull();
      });

      it('fixture.validCustomData.kind khớp stamp.kind', () => {
        expect(fixture.validCustomData.kind).toBe(stamp.kind);
      });
    });

    describe('matchesCustomData', () => {
      it('trả true cho customData hợp lệ của chính stamp', () => {
        expect(stamp.matchesCustomData(fixture.validCustomData)).toBe(true);
      });

      it('trả false cho null/undefined', () => {
        expect(stamp.matchesCustomData(null)).toBe(false);
        expect(stamp.matchesCustomData(undefined)).toBe(false);
      });

      it('trả false cho primitive', () => {
        expect(stamp.matchesCustomData(0)).toBe(false);
        expect(stamp.matchesCustomData('string')).toBe(false);
        expect(stamp.matchesCustomData(true)).toBe(false);
      });

      it('trả false cho empty object', () => {
        expect(stamp.matchesCustomData({})).toBe(false);
      });

      it('trả false cho customData kind khác', () => {
        const foreigns: unknown[] = [
          { kind: '__not_this_stamp__', version: 1 },
          { kind: '__not_this_stamp__', version: 99, payload: 'x' },
        ];
        for (const f of foreigns) {
          expect(stamp.matchesCustomData(f)).toBe(false);
        }
      });

      it('trả false cho customData thiếu version', () => {
        expect(stamp.matchesCustomData({ kind: stamp.kind })).toBe(false);
      });

      if (fixture.extraInvalid && fixture.extraInvalid.length > 0) {
        it.each(fixture.extraInvalid.map((d, i) => [i, d]))(
          'trả false cho extraInvalid[%i]',
          (_i, data) => {
            expect(stamp.matchesCustomData(data)).toBe(false);
          },
        );
      }
    });

    describe('renderSvgFromCustomData', () => {
      const itSvg = fixture.skipSvgRender ? it.skip : it;

      itSvg('return SVG string bắt đầu bằng <svg', async () => {
        const svg = await stamp.renderSvgFromCustomData(fixture.validCustomData);
        expect(typeof svg).toBe('string');
        expect(svg.length).toBeGreaterThan(0);
        expect(svg).toMatch(/^<svg/);
        // SVG có thể self-close (<svg .../>) hoặc có closing tag (</svg>) — chấp nhận cả 2.
        expect(svg).toMatch(/<\/svg>|\/>\s*$/);
      });

      itSvg('throws khi customData không match stamp này', async () => {
        await expect(
          stamp.renderSvgFromCustomData({ kind: '__definitely_not_this_stamp__' } as never),
        ).rejects.toThrow();
      });
    });

    describe('Host component', () => {
      it('Host được khai báo', () => {
        expect(stamp.Host).toBeDefined();
        expect(stamp.Host).not.toBeNull();
      });

      it('Host là function component hoặc React.lazy/forwardRef object', () => {
        // React.lazy() → { $$typeof, _payload, _init } (object)
        // React.forwardRef() → { $$typeof, render } (object)
        // Function component → function
        const t = typeof stamp.Host;
        expect(['function', 'object']).toContain(t);
        if (t === 'object') {
          // React internal marker — phải có $$typeof Symbol để React render được
          expect(
            (stamp.Host as unknown as { $$typeof?: symbol }).$$typeof,
          ).toBeDefined();
        }
      });
    });

    describe('roundtrip qua restoreFileFromCustomData', () => {
      const shouldRun =
        !fixture.skipRestoreFile &&
        !!fixture.sampleElement &&
        typeof stamp.restoreFileFromCustomData === 'function';
      const itRoundtrip = shouldRun ? it : it.skip;

      itRoundtrip('SVG → dataURL hợp lệ + preserve fileId', async () => {
        const el = fixture.sampleElement!;
        const restored = await stamp.restoreFileFromCustomData!(el as never);
        expect(restored).not.toBeNull();
        if (restored) {
          expect(restored.fileId).toBe(el.fileId);
          expect(restored.dataURL).toMatch(/^data:image\/(svg\+xml|png);base64,/);
          expect(restored.mimeType).toMatch(/^image\/(svg\+xml|png)$/);
        }
      });

      itRoundtrip('trả null khi element không có fileId', async () => {
        const el = { ...fixture.sampleElement!, fileId: '' };
        const restored = await stamp.restoreFileFromCustomData!(el as never);
        expect(restored).toBeNull();
      });

      itRoundtrip('trả null khi customData không match stamp', async () => {
        const el = {
          id: 'foreign',
          fileId: 'file-1',
          customData: { kind: '__not_this_stamp__', version: 1 },
        };
        const restored = await stamp.restoreFileFromCustomData!(el as never);
        expect(restored).toBeNull();
      });
    });
  });
}
