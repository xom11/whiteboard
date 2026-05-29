// src/stamps/geometry-2d/dsl/names.ts
import { z } from 'zod';

// Label-style name: chữ cái Latin đầu, cho phép unicode prime (') + subscript ₀-₉.
// Max length 12 ký tự. Phân biệt hoa/thường.
export const NameZ = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_'₀-₉]{0,11}$/);
