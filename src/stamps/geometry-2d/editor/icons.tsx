import React from 'react';

// Design system:
//   - Main strokes use currentColor → respect active state (white-on-emerald).
//   - 4 accent colors stay fixed across states:
//       point     → blue dot (signature từ GeoGebra)
//       construct → red dashed/solid helper line (perpendicular, bisector, parallel, tangent)
//       fill      → orange polygon/area fill (light)
//       arc       → emerald arc cho measurement
//   - ViewBox 24×24, stroke 1.4–1.7, round caps cho cảm giác sketch-like.
const C_POINT = '#2563eb';
const C_CONSTRUCT = '#dc2626';
const C_FILL = '#f59e0b';
const C_ARC = '#059669';

export const Icon = {
  // ===== Basic =====
  cursor: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 3 L5 18 L9.5 14 L12 20 L14 19.2 L11.5 13.5 L17.5 13.5 Z"
        fill="currentColor" fillOpacity="0.12"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"
      />
    </svg>
  ),
  select: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinejoin="round" strokeLinecap="round">
      <rect x="2.5" y="2.5" width="14" height="14" rx="0.5" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 1.8"/>
      <path d="M10 10 L21 14.5 L14.5 16 L12.5 22 Z" fill="currentColor" fillOpacity="0.5" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),

  // ===== Point =====
  point: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="9.5" cy="14" r="3.2" fill={C_POINT}/>
      <text x="13.5" y="10.5" fontSize="9.5" fontFamily="serif" fontStyle="italic" fontWeight="600" fill={C_POINT}>A</text>
    </svg>
  ),
  midpoint: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="4" cy="12" r="1.8" fill={C_POINT}/>
      <circle cx="20" cy="12" r="1.8" fill={C_POINT}/>
      <circle cx="12" cy="12" r="2.6" fill={C_CONSTRUCT}/>
    </svg>
  ),
  perpFoot: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      {/* Base line ngang (input — currentColor) */}
      <line x1="2" y1="17" x2="22" y2="17" stroke="currentColor" strokeWidth="1.5"/>
      {/* Vertical dashed line từ BLUE point xuống chân (construct/red) */}
      <line x1="9" y1="5" x2="9" y2="17" stroke={C_CONSTRUCT} strokeWidth="1.4" strokeDasharray="2.5 2"/>
      {/* Right-angle mark tại chân */}
      <rect x="9" y="13.5" width="3.5" height="3.5" fill="none" stroke="currentColor" strokeWidth="1"/>
      {/* BLUE point gốc */}
      <circle cx="9" cy="5" r="2" fill={C_POINT}/>
      {/* RED point chân (output) */}
      <circle cx="9" cy="17" r="2.4" fill={C_CONSTRUCT}/>
    </svg>
  ),
  intersect: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <path d="M3 5 L21 19" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M21 5 L3 19" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="12" cy="12" r="2.6" fill={C_CONSTRUCT}/>
    </svg>
  ),

  // ===== Line =====
  segment: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <line x1="5" y1="18" x2="19" y2="6" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="5" cy="18" r="2.2" fill={C_POINT}/>
      <circle cx="19" cy="6" r="2.2" fill={C_POINT}/>
    </svg>
  ),
  line: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <line x1="2" y1="21" x2="22" y2="3" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="8.5" cy="15.5" r="1.9" fill={C_POINT}/>
      <circle cx="15.5" cy="8.5" r="1.9" fill={C_POINT}/>
    </svg>
  ),
  ray: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="19" x2="22" y2="2" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="5" cy="19" r="2.2" fill={C_POINT}/>
      <circle cx="12" cy="12" r="1.7" fill={C_POINT}/>
    </svg>
  ),
  vector: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="19" x2="18" y2="6"/>
      <polyline points="13,5 19,5 19,11"/>
      <circle cx="5" cy="19" r="2" fill={C_POINT} stroke="none"/>
    </svg>
  ),

  // ===== Construct =====
  perpendicular: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <line x1="2" y1="17" x2="22" y2="17" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="12" y1="3" x2="12" y2="17" stroke={C_CONSTRUCT} strokeWidth="1.5"/>
      <rect x="12" y="13.5" width="3.5" height="3.5" fill="none" stroke="currentColor" strokeWidth="1"/>
      <circle cx="12" cy="17" r="1.8" fill={C_POINT}/>
    </svg>
  ),
  parallel: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      {/* Đường đen = đã có (input). Đường đỏ = đường song song mới dựng đi qua điểm xanh. */}
      <line x1="2" y1="9" x2="22" y2="6" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="2" y1="19" x2="22" y2="16" stroke={C_CONSTRUCT} strokeWidth="1.5"/>
      <circle cx="12" cy="17.5" r="1.9" fill={C_POINT}/>
    </svg>
  ),
  perpBisector: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <line x1="4" y1="16" x2="20" y2="16" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="12" y1="3" x2="12" y2="22" stroke={C_CONSTRUCT} strokeWidth="1.4" strokeDasharray="2.5 2"/>
      <circle cx="4" cy="16" r="2" fill={C_POINT}/>
      <circle cx="20" cy="16" r="2" fill={C_POINT}/>
    </svg>
  ),
  bisector: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <line x1="4" y1="20" x2="22" y2="20" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="4" y1="20" x2="22" y2="4" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="4" y1="20" x2="23" y2="11" stroke={C_CONSTRUCT} strokeWidth="1.4" strokeDasharray="2.5 2"/>
    </svg>
  ),

  // ===== Polygon =====
  polygon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinejoin="round">
      <polygon points="6,5 18,6 22,14 13,21 4,16" fill={C_FILL} fillOpacity="0.28" stroke={C_FILL} strokeWidth="1.5"/>
      <circle cx="6" cy="5" r="1.5" fill={C_POINT}/>
      <circle cx="18" cy="6" r="1.5" fill={C_POINT}/>
      <circle cx="22" cy="14" r="1.5" fill={C_POINT}/>
      <circle cx="13" cy="21" r="1.5" fill={C_POINT}/>
      <circle cx="4" cy="16" r="1.5" fill={C_POINT}/>
    </svg>
  ),
  regularPolygon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinejoin="round">
      <polygon points="12,3 20.5,8 20.5,16 12,21 3.5,16 3.5,8" fill={C_FILL} fillOpacity="0.28" stroke={C_FILL} strokeWidth="1.5"/>
      <circle cx="12" cy="3" r="1.7" fill={C_POINT}/>
      <circle cx="20.5" cy="8" r="1.7" fill={C_POINT}/>
    </svg>
  ),

  // ===== Circle =====
  circleCenter: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="13" r="8" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="11" cy="13" r="1.7" fill={C_POINT}/>
      <circle cx="19" cy="13" r="1.7" fill={C_POINT}/>
    </svg>
  ),
  semicircle: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      {/* Nửa đường tròn emerald-arc, 2 endpoint blue ở đáy */}
      <path d="M 4 16 A 8 8 0 0 1 20 16" stroke={C_ARC} strokeWidth="1.6" fill="none"/>
      <line x1="4" y1="16" x2="20" y2="16" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 1.6"/>
      <circle cx="4" cy="16" r="1.9" fill={C_POINT}/>
      <circle cx="20" cy="16" r="1.9" fill={C_POINT}/>
    </svg>
  ),
  arcCenter: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      {/* Tâm blue (lớn) + cung emerald + 2 đầu cung blue (nhỏ), 2 bán kính nét đứt */}
      <path d="M 6 6 A 9 9 0 0 1 18 18" stroke={C_ARC} strokeWidth="1.7" fill="none"/>
      <line x1="12" y1="12" x2="6" y2="6" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5" opacity="0.5"/>
      <line x1="12" y1="12" x2="18" y2="18" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5" opacity="0.5"/>
      <circle cx="12" cy="12" r="2" fill={C_POINT}/>
      <circle cx="6" cy="6" r="1.4" fill={C_POINT}/>
      <circle cx="18" cy="18" r="1.4" fill={C_POINT}/>
    </svg>
  ),
  arc3: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      {/* Circle arc đi qua 3 điểm: (4,17), (12,9), (20,17). Tâm (12,17), r=8. */}
      <path d="M 4 17 A 8 8 0 0 1 20 17" stroke={C_ARC} strokeWidth="1.8" fill="none"/>
      <circle cx="4" cy="17" r="1.9" fill={C_POINT}/>
      <circle cx="12" cy="9" r="1.9" fill={C_POINT}/>
      <circle cx="20" cy="17" r="1.9" fill={C_POINT}/>
    </svg>
  ),
  sectorCenter: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinejoin="round">
      {/* Tâm blue + 2 bán kính + cung emerald + fill orange */}
      <path d="M 12 12 L 5 7 A 8.6 8.6 0 0 1 19 7 Z"
            fill={C_FILL} fillOpacity="0.25"
            stroke={C_ARC} strokeWidth="1.6"/>
      <line x1="12" y1="12" x2="5" y2="7" stroke="currentColor" strokeWidth="1.3"/>
      <line x1="12" y1="12" x2="19" y2="7" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="12" cy="12" r="1.8" fill={C_POINT}/>
      <circle cx="5" cy="7" r="1.4" fill={C_POINT}/>
      <circle cx="19" cy="7" r="1.4" fill={C_POINT}/>
    </svg>
  ),
  circle3: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="12" cy="5" r="1.7" fill={C_POINT}/>
      <circle cx="19" cy="16" r="1.7" fill={C_POINT}/>
      <circle cx="5" cy="16" r="1.7" fill={C_POINT}/>
    </svg>
  ),
  tangent: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      {/* Circle C=(10,13) r=5; external point P=(20,4); tangent points T1≈(14.5,15.2), T2≈(8.3,8.3) */}
      <circle cx="10" cy="13" r="5" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="20" y1="4" x2="14.5" y2="15.2" stroke={C_CONSTRUCT} strokeWidth="1.6"/>
      <line x1="20" y1="4" x2="8.3" y2="8.3" stroke={C_CONSTRUCT} strokeWidth="1.6"/>
      <circle cx="20" cy="4" r="1.9" fill={C_POINT}/>
      <circle cx="14.5" cy="15.2" r="1.4" fill={C_CONSTRUCT}/>
      <circle cx="8.3" cy="8.3" r="1.4" fill={C_CONSTRUCT}/>
    </svg>
  ),

  // ===== Triangle centers =====
  centroid: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinejoin="round">
      {/* Tam giác outline + fill orange nhạt */}
      <polygon points="4,20 20,20 12,4" fill={C_FILL} fillOpacity="0.18" stroke="currentColor" strokeWidth="1.4"/>
      {/* 3 medians: vertex → midpoint cạnh đối diện (xám dashed) */}
      <line x1="12" y1="4"  x2="12" y2="20" stroke="#94a3b8" strokeWidth="1" strokeDasharray="1.5 1.5"/>
      <line x1="4"  y1="20" x2="16" y2="12" stroke="#94a3b8" strokeWidth="1" strokeDasharray="1.5 1.5"/>
      <line x1="20" y1="20" x2="8"  y2="12" stroke="#94a3b8" strokeWidth="1" strokeDasharray="1.5 1.5"/>
      {/* 3 đỉnh BLUE */}
      <circle cx="4"  cy="20" r="1.5" fill={C_POINT}/>
      <circle cx="20" cy="20" r="1.5" fill={C_POINT}/>
      <circle cx="12" cy="4"  r="1.5" fill={C_POINT}/>
      {/* Trọng tâm RED tại giao 3 medians */}
      <circle cx="12" cy="14.67" r="2.4" fill={C_CONSTRUCT}/>
    </svg>
  ),
  circumcenter: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      {/* Đường tròn ngoại tiếp */}
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4"/>
      {/* Tam giác nội tiếp */}
      <polygon points="12,3 21,16 3,16" fill="none" stroke="currentColor" strokeWidth="1.3"/>
      {/* 3 đỉnh BLUE */}
      <circle cx="12" cy="3"  r="1.6" fill={C_POINT}/>
      <circle cx="21" cy="16" r="1.6" fill={C_POINT}/>
      <circle cx="3"  cy="16" r="1.6" fill={C_POINT}/>
      {/* Tâm ngoại tiếp RED */}
      <circle cx="12" cy="12" r="2.4" fill={C_CONSTRUCT}/>
    </svg>
  ),
  incenter: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      {/* Tam giác outline */}
      <polygon points="3,20 21,20 12,4" fill="none" stroke="currentColor" strokeWidth="1.4"/>
      {/* Đường tròn nội tiếp */}
      <circle cx="12" cy="14" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
      {/* 3 đỉnh BLUE */}
      <circle cx="3"  cy="20" r="1.6" fill={C_POINT}/>
      <circle cx="21" cy="20" r="1.6" fill={C_POINT}/>
      <circle cx="12" cy="4"  r="1.6" fill={C_POINT}/>
      {/* Tâm nội tiếp RED */}
      <circle cx="12" cy="14" r="2.2" fill={C_CONSTRUCT}/>
    </svg>
  ),
  orthocenter: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      {/* Tam giác outline */}
      <polygon points="3,20 21,20 8,5" fill="none" stroke="currentColor" strokeWidth="1.4"/>
      {/* 2 altitudes (dashed red) — đủ giao điểm */}
      <line x1="8" y1="5"  x2="8"    y2="20"   stroke={C_CONSTRUCT} strokeWidth="1.2" strokeDasharray="2 1.6"/>
      <line x1="3" y1="20" x2="14.5" y2="11.5" stroke={C_CONSTRUCT} strokeWidth="1.2" strokeDasharray="2 1.6"/>
      {/* 3 đỉnh BLUE */}
      <circle cx="3"  cy="20"  r="1.6" fill={C_POINT}/>
      <circle cx="21" cy="20"  r="1.6" fill={C_POINT}/>
      <circle cx="8"  cy="5"   r="1.6" fill={C_POINT}/>
      {/* Trực tâm RED — giao 2 altitudes */}
      <circle cx="8"  cy="14.5" r="2.4" fill={C_CONSTRUCT}/>
    </svg>
  ),

  // ===== Measure =====
  angle: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="20" x2="22" y2="20" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="4" y1="20" x2="22" y2="6" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M14 20 A 10 10 0 0 0 11 13.4" stroke={C_ARC} strokeWidth="1.6" fill="none"/>
      <circle cx="4" cy="20" r="1.7" fill={C_POINT}/>
    </svg>
  ),
  distance: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <line x1="5" y1="16" x2="19" y2="16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="5" cy="16" r="2" fill={C_POINT}/>
      <circle cx="19" cy="16" r="2" fill={C_POINT}/>
      <text x="8.5" y="11" fontSize="7" fontFamily="serif" fontStyle="italic" fontWeight="600" fill="currentColor">cm</text>
    </svg>
  ),
  area: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinejoin="round">
      <polygon points="4,10 14,3.5 21,12 16,21 5,18" fill={C_FILL} fillOpacity="0.32" stroke={C_FILL} strokeWidth="1.4"/>
      <text x="1.5" y="8" fontSize="6.5" fontFamily="serif" fontStyle="italic" fontWeight="600" fill="currentColor">cm²</text>
    </svg>
  ),

  // ===== Edit =====
  toggleLabel: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <text x="1.5" y="19" fontSize="15" fontFamily="serif" fontWeight="700" fill="currentColor">A</text>
      <text x="12" y="19" fontSize="15" fontFamily="serif" fontWeight="700" fill="currentColor" fillOpacity="0.35">A</text>
    </svg>
  ),
  toggleVisible: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="8" cy="12" r="3.2" fill={C_POINT}/>
      <circle cx="17" cy="12" r="3.2" fill="none" stroke={C_POINT} strokeWidth="1.6"/>
    </svg>
  ),
  trash: (
    // Eraser hình bình hành — GeoGebra dùng eraser, không phải trash bin.
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinejoin="round" strokeLinecap="round">
      <path d="M14.5 3 L21 9.5 L11.5 19 L4 19 L4 11.5 Z" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="9.5" y1="8" x2="16" y2="14.5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),

  // ===== Transform =====
  // Style chung: BLUE = input (điểm gốc / tâm), RED = output (ảnh sau biến hình).
  // Mảnh, ít chi tiết — focus vào quan hệ điểm gốc ↔ ảnh.
  translate: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Vector tịnh tiến rời (mũi tên đen) — START thẳng hàng dọc với chấm xanh (x=7), xuống dưới đáy icon, song song với gốc→ảnh */}
      <line x1="7" y1="21" x2="12.5" y2="16.25" stroke="currentColor" strokeWidth="1.4"/>
      <polyline points="11.94,17.85 12.5,16.25 10.83,16.57" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      {/* Điểm gốc BLUE → mũi tên xám → ảnh RED (cùng hướng vector trên) */}
      <line x1="7" y1="15" x2="18" y2="5.5" stroke="#94a3b8" strokeWidth="1.4"/>
      <polyline points="15.54,5.97 18,5.5 17.18,7.86" stroke="#94a3b8" strokeWidth="1.4" fill="none"/>
      <circle cx="7" cy="15" r="2" fill={C_POINT}/>
      <circle cx="18" cy="5.5" r="2" fill={C_CONSTRUCT}/>
    </svg>
  ),
  rotate: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Tâm quay BLUE (lớn) ở dưới + 2 bán kính + cung α (centered tại vertex, bulge lên) + α + gốc BLUE → ảnh RED */}
      <line x1="12" y1="18" x2="20" y2="6" stroke="currentColor" strokeWidth="1" opacity="0.55"/>
      <line x1="12" y1="18" x2="4" y2="9" stroke="currentColor" strokeWidth="1" opacity="0.55"/>
      {/* Arc r=4 quanh vertex (12,18): start (14.22,14.67) → end (9.34,15.01), short arc bulge UP */}
      <path d="M 14.22 14.67 A 4 4 0 0 0 9.34 15.01" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      <text x="10" y="14" fontSize="7" fontFamily="serif" fontStyle="italic" fontWeight="700" fill="currentColor">α</text>
      <circle cx="12" cy="18" r="2.4" fill={C_POINT} stroke="#fff" strokeWidth="0.8"/>
      <circle cx="20" cy="6" r="1.9" fill={C_POINT}/>
      <circle cx="4" cy="9" r="1.9" fill={C_CONSTRUCT}/>
    </svg>
  ),
  reflectLine: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      {/* Trục đối xứng (đường đen chéo) */}
      <line x1="3" y1="21" x2="21" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Điểm gốc BLUE (phía trên trục) + ảnh RED (phía dưới trục, đối xứng) */}
      <circle cx="5" cy="11" r="2" fill={C_POINT}/>
      <circle cx="13" cy="19" r="2" fill={C_CONSTRUCT}/>
    </svg>
  ),
  reflectPoint: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      {/* Điểm gốc BLUE + tâm BLUE (lớn hơn) + ảnh RED, thẳng hàng & cách đều */}
      <line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" strokeWidth="0.9" strokeDasharray="1.5 1.5" opacity="0.45"/>
      <circle cx="5" cy="19" r="1.9" fill={C_POINT}/>
      <circle cx="12" cy="12" r="2.6" fill={C_POINT} stroke="#fff" strokeWidth="0.8"/>
      <circle cx="19" cy="5" r="1.9" fill={C_CONSTRUCT}/>
    </svg>
  ),
  dilate: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      {/* Tâm vị tự BLUE + điểm gốc BLUE (gần tâm) + ảnh RED (xa hơn) — chừa chỗ cho k phía trên đường */}
      <line x1="3" y1="20" x2="21" y2="4" stroke="currentColor" strokeWidth="0.9" strokeDasharray="1.5 1.5" opacity="0.5"/>
      <circle cx="4" cy="19" r="2.2" fill={C_POINT} stroke="#fff" strokeWidth="0.8"/>
      <circle cx="8" cy="15.5" r="1.7" fill={C_POINT}/>
      <circle cx="19" cy="5.7" r="1.9" fill={C_CONSTRUCT}/>
      <text x="10.5" y="10.5" fontSize="8" fontFamily="serif" fontStyle="italic" fontWeight="700" fill="currentColor">k</text>
    </svg>
  ),

  // ===== Special shapes =====
  square: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="5" width="14" height="14" fill={C_FILL} fillOpacity="0.18" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="5" cy="5" r="1.7" fill={C_POINT}/>
      <circle cx="19" cy="5" r="1.7" fill={C_POINT}/>
    </svg>
  ),
  rectangle: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="7" width="18" height="10" fill={C_FILL} fillOpacity="0.18" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="3" cy="17" r="1.7" fill={C_POINT}/>
      <circle cx="21" cy="17" r="1.7" fill={C_POINT}/>
      <circle cx="21" cy="7" r="1.7" fill={C_POINT}/>
    </svg>
  ),
  rhombus: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M 12 3 L 21 12 L 12 21 L 3 12 Z" fill={C_FILL} fillOpacity="0.18" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="3" cy="12" r="1.7" fill={C_POINT}/>
      <circle cx="12" cy="21" r="1.7" fill={C_POINT}/>
      <circle cx="21" cy="12" r="1.7" fill={C_POINT}/>
    </svg>
  ),
  parallelogram: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M 5 19 L 21 19 L 19 5 L 3 5 Z" fill={C_FILL} fillOpacity="0.18" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="3" cy="5" r="1.7" fill={C_POINT}/>
      <circle cx="19" cy="5" r="1.7" fill={C_POINT}/>
      <circle cx="21" cy="19" r="1.7" fill={C_POINT}/>
    </svg>
  ),
  isoTrapezoid: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M 3 19 L 21 19 L 17 5 L 7 5 Z" fill={C_FILL} fillOpacity="0.18" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="3" cy="19" r="1.7" fill={C_POINT}/>
      <circle cx="21" cy="19" r="1.7" fill={C_POINT}/>
      <circle cx="7" cy="5" r="1.7" fill={C_POINT}/>
    </svg>
  ),
  isoTriangle: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M 12 4 L 21 20 L 3 20 Z" fill={C_FILL} fillOpacity="0.18" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="3" cy="20" r="1.7" fill={C_POINT}/>
      <circle cx="21" cy="20" r="1.7" fill={C_POINT}/>
      <circle cx="12" cy="4" r="1.7" fill={C_POINT}/>
      {/* dashed perpendicular bisector hint */}
      <line x1="12" y1="4" x2="12" y2="20" stroke={C_CONSTRUCT} strokeWidth="0.8" strokeDasharray="1.5 1.5" opacity="0.7"/>
    </svg>
  ),
  rightTriangle: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M 4 20 L 20 20 L 4 4 Z" fill={C_FILL} fillOpacity="0.18" stroke="currentColor" strokeWidth="1.6"/>
      {/* right-angle marker */}
      <path d="M 4 17 L 7 17 L 7 20" fill="none" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="4" cy="20" r="1.7" fill={C_POINT}/>
      <circle cx="20" cy="20" r="1.7" fill={C_POINT}/>
      <circle cx="4" cy="4" r="1.7" fill={C_POINT}/>
    </svg>
  ),
};

export const GeometryIconHeader = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="4,20 20,20 12,5" />
    <circle cx="4" cy="20" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="20" cy="20" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

export function UndoIcon(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 7 3 13 9 13" />
      <path d="M3.51 13a9 9 0 1 0 2.13-9.36L3 7" />
    </svg>
  );
}

export function RedoIcon(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 7 21 13 15 13" />
      <path d="M20.49 13a9 9 0 1 1-2.12-9.36L21 7" />
    </svg>
  );
}
