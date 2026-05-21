import { act, renderHook } from '@testing-library/react';
import { usePdfImporter } from './usePdfImporter';

jest.mock('../pdf/rasterize', () => ({
  loadPdfDocument: jest.fn(async () => ({ numPages: 3 })),
  closePdfDocument: jest.fn(async () => undefined),
  rasterizePdf: jest.fn(async () => [{ pageNumber: 1, dataURL: 'x', width: 100, height: 100 }]),
}));

jest.mock('../pdf/insertPdfPages', () => ({
  insertRasterizedPagesIntoScene: jest.fn(),
}));

describe('usePdfImporter', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('default state pdfPending=null, pdfBusy=false', () => {
    const { result } = renderHook(() => usePdfImporter({ readOnly: false, api: null }));
    expect(result.current.pdfPending).toBeNull();
    expect(result.current.pdfBusy).toBe(false);
  });

  it('handlePdfPick load doc + set pending', async () => {
    const { result } = renderHook(() => usePdfImporter({ readOnly: false, api: null }));
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    await act(async () => { await result.current.handlePdfPick(file); });
    expect(result.current.pdfPending).toEqual({
      doc: { numPages: 3 },
      fileName: 'doc.pdf',
      totalPages: 3,
    });
    expect(result.current.pdfBusy).toBe(false);
  });

  it('handlePdfPick respect readOnly = no-op', async () => {
    const { result } = renderHook(() => usePdfImporter({ readOnly: true, api: null }));
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    await act(async () => { await result.current.handlePdfPick(file); });
    expect(result.current.pdfPending).toBeNull();
  });

  it('handlePdfCancel clear pending + đóng doc', async () => {
    const { result } = renderHook(() => usePdfImporter({ readOnly: false, api: null }));
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    await act(async () => { await result.current.handlePdfPick(file); });
    expect(result.current.pdfPending).not.toBeNull();
    act(() => { result.current.handlePdfCancel(); });
    expect(result.current.pdfPending).toBeNull();
    const { closePdfDocument } = jest.requireMock('../pdf/rasterize');
    expect(closePdfDocument).toHaveBeenCalled();
  });

  it('handlePdfConfirm without api = no-op', async () => {
    const { result } = renderHook(() => usePdfImporter({ readOnly: false, api: null }));
    await act(async () => { await result.current.handlePdfConfirm([1]); });
    const { rasterizePdf } = jest.requireMock('../pdf/rasterize');
    expect(rasterizePdf).not.toHaveBeenCalled();
  });
});
