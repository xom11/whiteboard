"use client";
// src/stamps/geometry-3d/serialize.ts
function isGeometry3DCustomData(data) {
  if (!data || typeof data !== "object") return false;
  const d = data;
  return d.kind === "geometry3d" && (d.version === 1 || d.version === 2) && typeof d.jsonState === "string";
}
function serializeBoard3D(state) {
  return JSON.stringify(state);
}
function parseSerializedBoard3D(json) {
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("parseSerializedBoard3D: not an object");
  }
  const p = parsed;
  if (p.version !== 1 && p.version !== 2) {
    throw new Error(`parseSerializedBoard3D: unsupported version ${String(p.version)}`);
  }
  if (!Array.isArray(p.elements)) {
    throw new Error("parseSerializedBoard3D: elements missing");
  }
  return parsed;
}

export { isGeometry3DCustomData, parseSerializedBoard3D, serializeBoard3D };
//# sourceMappingURL=chunk-BFUP5QTF.mjs.map
//# sourceMappingURL=chunk-BFUP5QTF.mjs.map