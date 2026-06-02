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

describe('AiFigurePrompt — vision/image upload', () => {
  beforeEach(() => {
    extractMock.mockReset();
    mockSetPrompt = jest.fn();
    // Cập nhật implementation mỗi test để dùng mockSetPrompt mới
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
      tokens: null,
      mode: 'build',
      setMode: jest.fn(),
      entityCount: { points: 0, shapes: 0 },
      hasUnsupported: false,
    }));
  });

  it('shows toggle button "Đọc đề từ ảnh" when no image', () => {
    render(<AiFigurePrompt generator={noopGenerator} onGenerated={jest.fn()} />);
    expect(screen.getByRole('button', { name: /đọc đề từ ảnh|ảnh đề/i })).toBeInTheDocument();
  });

  it('shows ImageDropZone after clicking toggle', () => {
    render(<AiFigurePrompt generator={noopGenerator} onGenerated={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /đọc đề từ ảnh|ảnh đề/i }));
    expect(screen.getByRole('region', { name: /khu vực kéo thả/i })).toBeInTheDocument();
  });

  it('OCR success → fills textarea với extracted text', async () => {
    extractMock.mockResolvedValueOnce({
      kind: 'success',
      text: 'Cho tam giác ABC vuông tại A',
      usage: { inputTokens: 50, outputTokens: 10 },
    });

    render(<AiFigurePrompt generator={noopGenerator} onGenerated={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /đọc đề từ ảnh|ảnh đề/i }));

    // Inject image via file input.
    const file = new File([new Uint8Array([0x89, 0x50])], 'a.png', { type: 'image/png' });
    const input = screen.getByLabelText(/chọn ảnh/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => screen.getByRole('button', { name: /đọc đề bài|^đọc đề$/i }));

    // Trigger OCR.
    fireEvent.click(screen.getByRole('button', { name: /đọc đề bài|^đọc đề$/i }));

    await waitFor(() => expect(mockSetPrompt).toHaveBeenCalledWith('Cho tam giác ABC vuông tại A'));
  });

  it('OCR refused → shows toast/error message', async () => {
    extractMock.mockResolvedValueOnce({
      kind: 'refused',
      reason: 'not-math',
      message: 'Ảnh không phải đề toán',
    });
    render(<AiFigurePrompt generator={noopGenerator} onGenerated={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /đọc đề từ ảnh|ảnh đề/i }));
    const file = new File([new Uint8Array([0x89])], 'a.png', { type: 'image/png' });
    const input = screen.getByLabelText(/chọn ảnh/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => screen.getByRole('button', { name: /đọc đề bài|^đọc đề$/i }));
    fireEvent.click(screen.getByRole('button', { name: /đọc đề bài|^đọc đề$/i }));

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
    fireEvent.click(screen.getByRole('button', { name: /đọc đề từ ảnh|ảnh đề/i }));
    const file = new File([new Uint8Array([0x89])], 'a.png', { type: 'image/png' });
    const input = screen.getByLabelText(/chọn ảnh/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => screen.getByRole('button', { name: /đọc đề bài|^đọc đề$/i }));
    fireEvent.click(screen.getByRole('button', { name: /đọc đề bài|^đọc đề$/i }));

    await waitFor(() =>
      expect(screen.getByText(/không chính xác|kiểm tra/i)).toBeInTheDocument(),
    );
  });
});
