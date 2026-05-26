import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PageRangeDialog } from '../PageRangeDialog';

// Mock rasterize để không gọi pdfjs thật trong jsdom.
jest.mock('../rasterize', () => ({
  renderAllThumbnails: jest.fn(),
}));

 
const { renderAllThumbnails } = require('../rasterize') as {
  renderAllThumbnails: jest.Mock;
};

function makeFakeDoc(numPages: number) {
   
  return { numPages } as any;
}

beforeEach(() => {
  renderAllThumbnails.mockReset();
  // Mặc định: render thumbnails đồng bộ ngay, mỗi page 1 dataURL fake.
  renderAllThumbnails.mockImplementation(async (doc, onEach) => {
    for (let i = 1; i <= doc.numPages; i++) {
      onEach(i, `data:image/jpeg;base64,thumb${i}`, 90, 120);
    }
  });
});

describe('PageRangeDialog', () => {
  it('default chọn tất cả trang, input = "1-N"', async () => {
    render(
      <PageRangeDialog
        doc={makeFakeDoc(10)}
        fileName="test.pdf"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('1-10');
    expect(
      screen.getByText((_, n) => n?.textContent === 'test.pdf — 10 trang'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('pdf-range-status').textContent,
    ).toBe('Đã chọn 10 / 10 trang');
  });

  it('default value = "1" khi N=1', () => {
    render(
      <PageRangeDialog
        doc={makeFakeDoc(1)}
        fileName="single.pdf"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('1');
  });

  it('hiển thị error khi range không hợp lệ', () => {
    render(
      <PageRangeDialog
        doc={makeFakeDoc(5)}
        fileName="x.pdf"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '99' } });
    expect(screen.getByText(/vượt giới hạn/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Chèn/ })).toBeDisabled();
  });

  it('submit gọi onConfirm với pages parsed', () => {
    const onConfirm = jest.fn();
    render(
      <PageRangeDialog
        doc={makeFakeDoc(5)}
        fileName="x.pdf"
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '1,3-4' } });
    fireEvent.click(screen.getByRole('button', { name: /^Chèn 3 trang/ }));
    expect(onConfirm).toHaveBeenCalledWith([1, 3, 4]);
  });

  it('huỷ button gọi onCancel', () => {
    const onCancel = jest.fn();
    render(
      <PageRangeDialog
        doc={makeFakeDoc(5)}
        fileName="x.pdf"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('Enter submit', () => {
    const onConfirm = jest.fn();
    render(
      <PageRangeDialog
        doc={makeFakeDoc(5)}
        fileName="x.pdf"
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onConfirm).toHaveBeenCalledWith([1, 2, 3, 4, 5]);
  });

  it('click thumbnail toggle page khỏi selection', async () => {
    render(
      <PageRangeDialog
        doc={makeFakeDoc(5)}
        fileName="x.pdf"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    // Đợi thumb render xong (mock onEach gọi sync nhưng setState batched).
    await waitFor(() => {
      expect(screen.getByLabelText(/Trang 3 \(đã chọn\)/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText(/Trang 3/));
    const input = screen.getByRole('textbox') as HTMLInputElement;
    // 3 bị bỏ → còn 1,2,4,5 → "1-2,4-5"
    expect(input.value).toBe('1-2,4-5');
  });

  it('nút "Bỏ hết" clear selection', () => {
    render(
      <PageRangeDialog
        doc={makeFakeDoc(5)}
        fileName="x.pdf"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByTitle('Bỏ chọn tất cả'));
    expect(screen.getByTestId('pdf-range-status').textContent).toBe(
      'Đã chọn 0 / 5 trang',
    );
    expect(screen.getByRole('button', { name: /^Chèn/ })).toBeDisabled();
  });

  it('nút "Tất cả" select lại tất cả sau khi clear', () => {
    render(
      <PageRangeDialog
        doc={makeFakeDoc(5)}
        fileName="x.pdf"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByTitle('Bỏ chọn tất cả'));
    fireEvent.click(screen.getByTitle('Chọn tất cả trang'));
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('1-5');
  });

  it('gõ text input update highlight thumbnail', async () => {
    render(
      <PageRangeDialog
        doc={makeFakeDoc(5)}
        fileName="x.pdf"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2,4' } });
    await waitFor(() => {
      expect(screen.getByLabelText(/Trang 2 \(đã chọn\)/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Trang 4 \(đã chọn\)/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Trang 1$/)).toBeInTheDocument(); // không có "(đã chọn)"
    });
  });

  it('abort signal khi unmount để dừng render thumbnails', () => {
    const { unmount } = render(
      <PageRangeDialog
        doc={makeFakeDoc(5)}
        fileName="x.pdf"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    const callArgs = renderAllThumbnails.mock.calls[0];
    const opts = callArgs[2] as { signal: AbortSignal };
    expect(opts.signal.aborted).toBe(false);
    unmount();
    expect(opts.signal.aborted).toBe(true);
  });
});
