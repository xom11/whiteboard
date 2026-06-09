// src/stamps/geometry-2d/ai/vision/index.ts
export {
  extractProblemFromImage,
  type ExtractProblemOptions,
  type ExtractProblemSuccess,
  type ExtractProblemFailure,
  type ExtractProblemOutcome,
} from './extractProblem';
export {
  fileToImagePart,
  inferMediaType,
  validateFile,
  MAX_EDGE_PX,
  MAX_RAW_BYTES,
  MAX_ENCODED_BYTES,
  type ValidationResult,
} from './preprocess';
export {
  runTesseractOcr,
  type TesseractOcrOptions,
  type TesseractOcrResult,
} from './tesseract';
export type { ImagePart } from './types';
