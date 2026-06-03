import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AiFigurePrompt } from '../AiFigurePrompt';
import type { GenerateGeometryFigure } from '../../shared/types';

// Mock fileToImagePart trong preprocess — phải trước các mock khác
jest.mock('../../ai/vision/preprocess', () => ({
  ...jest.requireActual('../../ai/vision/preprocess'),
  fileToImagePart: jest.fn(async (file: File) => ({
    mediaType: file.type as 'image/png' | 'image/jpeg' | 'image/webp',
    base64: 'MOCKBASE64',
  })),
}));

// Mock handleExtractProblem
const extractMock = jest.fn();
jest.mock('../../ai/handleExtractProblem', () => ({
  handleExtractProblem: (...args: unknown[]) => extractMock(...args),
}));

// Mock useAiFigure hook — dùng closure variable để capture spy giữa các test
let mockSetPrompt = jest.fn();

jest.mock('../useAiFigure', () => ({
  useAiFigure: jest.fn(),
}));

const noopGenerator: GenerateGeometryFigure = jest.fn();

/** Helper: attach file qua hidden input "Chọn ảnh đề bài". */
function attachImage(filename = 'a.png', type = 'image/png') {
  const file = new File([new Uint8Array([0x89, 0x50])], filename, { type });
  const input = screen.getByLabelText(/chọn ảnh/i) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

/** Helper: click nút gửi (OCR hoặc Dựng) — sau khi attach ảnh + prompt rỗng, nó là OCR. */
async function clickOcr() {
  // Chờ send button chuyển sang chế độ OCR (testid khác nhau giữa 2 mode).
  const btn = await screen.findByTestId('geometry-ai-ocr');
  fireEvent.click(btn);
}

describe('AiFigurePrompt — vision/image upload', () => {
  beforeEach(() => {
    extractMock.mockReset();
    mockSetPrompt = jest.fn();
    const { useAiFigure } = jest.requireMock('../useAiFigure') as {
      useAiFigure: jest.Mock;
    };
    useAiFigure.mockImplementation(() => ({
      prompt: '',
      setPrompt: mockSetPrompt,
      isLoading: false,
      error: null,
      submit: jest.fn(),
      cancel: jest.fn(),
      tokens: 0,
      mode: 'build',
      setMode: jest.fn(),
      entityCount: { points: 0, shapes: 0 },
      hasUnsupported: false,
    }));
  });

  it('luôn render paperclip button + hidden file input (không cần toggle)', () => {
    render(<AiFigurePrompt generator={noopGenerator} onGenerated={jest.fn()} />);
    expect(screen.getByRole('button', { name: /đính ảnh/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/chọn ảnh/i)).toBeInTheDocument();
  });

  it('composer cũng là drag-drop region', () => {
    render(<AiFigurePrompt generator={noopGenerator} onGenerated={jest.fn()} />);
    expect(screen.getByRole('region', { name: /khu vực kéo thả/i })).toBeInTheDocument();
  });

  it('attach ảnh → hiển thị thumbnail + nút Xoá', async () => {
    render(<AiFigurePrompt generator={noopGenerator} onGenerated={jest.fn()} />);
    attachImage();
    await waitFor(() => screen.getByRole('img', { name: /ảnh đề bài/i }));
    expect(screen.getByRole('button', { name: /xoá/i })).toBeInTheDocument();
  });

  it('OCR success → fills textarea với extracted text', async () => {
    extractMock.mockResolvedValueOnce({
      kind: 'success',
      text: 'Cho tam giác ABC vuông tại A',
      usage: { inputTokens: 50, outputTokens: 10 },
    });

    render(<AiFigurePrompt generator={noopGenerator} onGenerated={jest.fn()} />);
    attachImage();
    await clickOcr();

    await waitFor(() =>
      expect(mockSetPrompt).toHaveBeenCalledWith('Cho tam giác ABC vuông tại A'),
    );
  });

  it('OCR refused → shows error message', async () => {
    extractMock.mockResolvedValueOnce({
      kind: 'refused',
      reason: 'not-math',
      message: 'Ảnh không phải đề toán',
    });
    render(<AiFigurePrompt generator={noopGenerator} onGenerated={jest.fn()} />);
    attachImage();
    await clickOcr();

    await waitFor(() =>
      expect(screen.getByText(/không phải đề toán/i)).toBeInTheDocument(),
    );
  });

  it('OCR low-confidence → shows warning banner', async () => {
    extractMock.mockResolvedValueOnce({
      kind: 'low-confidence',
      text: 'short',
      warning: 'OCR có thể không chính xác, kiểm tra trước khi vẽ.',
      usage: { inputTokens: 0, outputTokens: 0 },
    });
    render(<AiFigurePrompt generator={noopGenerator} onGenerated={jest.fn()} />);
    attachImage();
    await clickOcr();

    await waitFor(() =>
      expect(screen.getByText(/không chính xác|kiểm tra/i)).toBeInTheDocument(),
    );
  });

  it('passes custom extractProblem prop instead of default', async () => {
    const customExtract = jest.fn().mockResolvedValue({
      kind: 'success',
      text: 'custom override text',
      usage: { inputTokens: 0, outputTokens: 0 },
    });
    const setPromptSpy = jest.fn();
    jest.requireMock('../useAiFigure').useAiFigure.mockImplementation(() => ({
      prompt: '',
      setPrompt: setPromptSpy,
      isLoading: false,
      error: null,
      submit: jest.fn(),
      cancel: jest.fn(),
      tokens: 0,
      mode: 'build',
      setMode: jest.fn(),
      entityCount: { points: 0, shapes: 0 },
      hasUnsupported: false,
    }));

    render(
      <AiFigurePrompt
        generator={noopGenerator}
        onGenerated={jest.fn()}
        extractProblem={customExtract}
      />,
    );
    attachImage();
    await clickOcr();

    await waitFor(() => expect(customExtract).toHaveBeenCalled());
    expect(extractMock).not.toHaveBeenCalled();
  });

  it('clears ocrError when user xoá ảnh', async () => {
    extractMock.mockResolvedValueOnce({
      kind: 'refused',
      reason: 'not-math',
      message: 'Ảnh không phải đề toán',
    });
    render(<AiFigurePrompt generator={noopGenerator} onGenerated={jest.fn()} />);
    attachImage();
    await clickOcr();
    await waitFor(() =>
      expect(screen.getByText(/không phải đề toán/i)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /xoá/i }));

    await waitFor(() =>
      expect(screen.queryByText(/không phải đề toán/i)).not.toBeInTheDocument(),
    );
  });

  it('paste handler: paste ảnh từ clipboard → attach', async () => {
    render(<AiFigurePrompt generator={noopGenerator} onGenerated={jest.fn()} />);
    const region = screen.getByRole('region', { name: /khu vực kéo thả/i });
    const file = new File([new Uint8Array([0x89])], 'pasted.png', { type: 'image/png' });
    fireEvent.paste(region, {
      clipboardData: {
        items: [
          {
            kind: 'file',
            type: 'image/png',
            getAsFile: () => file,
          },
        ],
      },
    });
    await waitFor(() => screen.getByRole('img', { name: /ảnh đề bài/i }));
  });
});
