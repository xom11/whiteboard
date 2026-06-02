// src/stamps/geometry-2d/ai/vision/index.ts
export {
  extractProblemFromImage,
  pickVisionModel,
  type ExtractProblemOptions,
  type ExtractProblemSuccess,
  type ExtractProblemFailure,
  type ExtractProblemOutcome,
} from './extractProblem';
export { buildVisionSystemPrompt, VISION_USER_PROMPT } from './prompt';
export {
  VisionEnvelopeZ,
  visionEnvelopeJsonSchema,
  type VisionEnvelopeT,
} from './envelope';
export {
  fileToImagePart,
  inferMediaType,
  validateFile,
  MAX_EDGE_PX,
  MAX_RAW_BYTES,
  MAX_ENCODED_BYTES,
  type ValidationResult,
} from './preprocess';
