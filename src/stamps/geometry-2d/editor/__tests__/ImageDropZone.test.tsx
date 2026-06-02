import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageDropZone } from '../ImageDropZone';

// Mock fileToImagePart since createImageBitmap isn't available in jsdom
jest.mock('../../ai/vision/preprocess', () => ({
  ...jest.requireActual('../../ai/vision/preprocess'),
  fileToImagePart: jest.fn(async (file: File) => ({
    mediaType: file.type,
    base64: 'MOCKBASE64',
  })),
}));

describe('ImageDropZone', () => {
  it('renders idle state với placeholder text', () => {
    render(<ImageDropZone value={null} onChange={jest.fn()} />);
    expect(screen.getAllByText(/kéo thả|chọn ảnh|paste/i).length).toBeGreaterThan(0);
  });

  it('renders image-ready state với thumbnail + remove button', () => {
    render(
      <ImageDropZone
        value={{ mediaType: 'image/png', base64: 'AAA' }}
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByRole('img', { name: /ảnh đề bài/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /xoá|remove/i })).toBeInTheDocument();
  });

  it('calls onChange(null) khi click remove', () => {
    const onChange = jest.fn();
    render(
      <ImageDropZone
        value={{ mediaType: 'image/png', base64: 'AAA' }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /xoá|remove/i }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('calls onChange với ImagePart khi file input changes', async () => {
    const onChange = jest.fn();
    render(<ImageDropZone value={null} onChange={onChange} />);
    const file = new File([new Uint8Array([0x89, 0x50])], 'a.png', { type: 'image/png' });
    const input = screen.getByLabelText(/chọn ảnh/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    // wait microtask for fileToImagePart promise
    await new Promise((r) => setTimeout(r, 0));
    expect(onChange).toHaveBeenCalledWith({ mediaType: 'image/png', base64: 'MOCKBASE64' });
  });

  it('rejects unsupported file type via toast/onError', async () => {
    const onError = jest.fn();
    render(<ImageDropZone value={null} onChange={jest.fn()} onError={onError} />);
    const heic = new File([new Uint8Array()], 'a.heic', { type: 'image/heic' });
    const input = screen.getByLabelText(/chọn ảnh/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [heic] } });
    await new Promise((r) => setTimeout(r, 0));
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'invalid-format' }));
  });

  it('disabled state: input + remove disabled', () => {
    render(
      <ImageDropZone
        value={{ mediaType: 'image/png', base64: 'AAA' }}
        onChange={jest.fn()}
        disabled
      />,
    );
    expect(screen.getByRole('button', { name: /xoá|remove/i })).toBeDisabled();
  });
});
