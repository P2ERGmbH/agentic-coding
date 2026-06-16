#!/usr/bin/env node

/**
 * generate-figma-css.mjs
 *
 * Generates CSS from a Figma JSON export in the EXACT format that
 * Figma's "Copy as Code → Copy All CSS" produces.
 *
 * This matches the real Figma export format:
 *   /* Layer Name *​/
 *   box-sizing: border-box;
 *   /* Auto layout *​/
 *   display: flex;
 *   flex-direction: row;
 *   justify-content: flex-end;
 *   align-items: flex-start;
 *   padding: 0px;
 *   gap: 4px;
 *   position: relative;
 *   width: 627px;
 *   height: 951px;
 *   /* color-name *​/
 *   background: #FFFFFF;
 *   border: 1px solid #CFD7E6;
 *   border-radius: 24px;
 *   /* Inside auto layout *​/
 *   flex: none;
 *   order: 0;
 *   flex-grow: 1;
 *
 * Usage:
 *   node generate-figma-css.mjs <input.json> [output.css]
 *   node generate-figma-css.mjs <input.json> --stdout
 *
 * Note: The figma-developer-mcp does NOT have a direct CSS download tool.
 *       It only provides get_figma_data (JSON) and download_figma_images (PNG).
 *       This script generates CSS from the Figma JSON data.
 */

import fs from 'fs';

const inputPath = process.argv[2];
const outputPath = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : null;
const printStdout = process.argv.includes('--stdout') || (!outputPath && !process.argv[3]);

if (!inputPath) {
  console.error('Usage: node generate-figma-css.mjs <input.json> [output.css]');
  console.error('       node generate-figma-css.mjs <input.json> --stdout');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

// ─── Color Style Name Map (from simplified figma-developer-mcp output) ──────
const styleColorMap = new Map();

function buildStyleMap(data) {
  if (data?.globalVars?.styles) {
    for (const [name, value] of Object.entries(data.globalVars.styles)) {
      const colors = [];
      if (typeof value === 'string') colors.push(value);
      else if (value?.colors) {
        for (const c of value.colors) {
          if (typeof c === 'string') colors.push(c);
        }
      }
      for (const c of colors) {
        styleColorMap.set(normalizeColor(c), name);
      }
    }
  }
}

function normalizeColor(str) {
  return str.trim().toLowerCase();
}

buildStyleMap(raw);

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Convert Figma float color (0-1 range) to 0-255 integer.
 * Uses a small epsilon to compensate for floating-point imprecision
 * (e.g., 0.8999999761581421 should round to 230, not 229).
 */
function figmaFloatToByte(value) {
  // Add small epsilon to compensate for floating-point imprecision in the Figma API
  // (e.g., 0.9 is stored as 0.8999999761581421; 0.9 * 255 = 229.5 should round to 230)
  return Math.round(Math.min(255, Math.max(0, (value ?? 0) * 255 + 1e-4)));
}

function rgbaFromFigmaColor(color, opacity) {
  if (!color) return null;
  const r = figmaFloatToByte(color.r);
  const g = figmaFloatToByte(color.g);
  const b = figmaFloatToByte(color.b);
  const a = opacity ?? color.a ?? 1;
  return { r, g, b, a };
}

function colorToHex(color, opacity) {
  const c = rgbaFromFigmaColor(color, opacity);
  if (!c) return null;
  if (c.a < 1) return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
  return `#${[c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0').toUpperCase()).join('')}`;
}

function lookupStyleName(color, opacity) {
  const c = rgbaFromFigmaColor(color, opacity);
  if (!c) return null;
  const rgba = `rgba(${c.r},${c.g},${c.b},${c.a})`;
  const hex = `#${[c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0').toUpperCase()).join('')}`;
  return styleColorMap.get(normalizeColor(rgba)) || styleColorMap.get(normalizeColor(hex)) || null;
}

function isVisible(node) {
  return node.visible !== false;
}

// ─── CSS Generation ─────────────────────────────────────────────────────────

let isRoot = true;
const sections = [];

function generateNodeCSS(node) {
  if (!node || !isVisible(node)) return;

  const lines = [];
  const insideLines = [];

  // ── Layer name header ──────────────────────────────────────────────────
  lines.push('');
  lines.push(`/* ${node.name} */`);

  // ── box-sizing (only for containers with borders) ──────────────────────
  if (node.strokes?.length > 0 || node.cornerRadius) {
    lines.push('');
    lines.push('box-sizing: border-box;');
  }

  // ── Auto Layout section ────────────────────────────────────────────────
  if (node.layoutMode) {
    lines.push('');
    lines.push('/* Auto layout */');
    lines.push('display: flex;');

    // flex-direction
    const flexDir = node.layoutMode === 'VERTICAL' ? 'column' : 'row';
    lines.push(`flex-direction: ${flexDir};`);

    // justify-content — Figma only outputs this for NON-DEFAULT values
    const jcValue = node.primaryAxisAlignItems;
    if (jcValue && jcValue !== 'MIN') {
      const jcMap = {
        MAX: 'flex-end',
        CENTER: 'center',
        SPACE_BETWEEN: 'space-between',
        SPACE_AROUND: 'space-around',
        SPACE_EVENLY: 'space-evenly',
        FLEX_START: 'flex-start',
        FLEX_END: 'flex-end',
      };
      lines.push(`justify-content: ${jcMap[jcValue] || 'flex-start'};`);
    }

    // align-items — Figma ALWAYS outputs this (defaults to flex-start)
    const aiValue = node.counterAxisAlignItems || 'MIN';
    const aiMap = {
      MIN: 'flex-start',
      MAX: 'flex-end',
      CENTER: 'center',
      BASELINE: 'baseline',
      STRETCH: 'stretch',
      FLEX_START: 'flex-start',
      FLEX_END: 'flex-end',
    };
    lines.push(`align-items: ${aiMap[aiValue] || 'flex-start'};`);

    // Padding — Figma always outputs padding even when 0
    const pt = node.paddingTop ?? 0;
    const pb = node.paddingBottom ?? 0;
    const pl = node.paddingLeft ?? 0;
    const pr = node.paddingRight ?? 0;
    if (pt === pb && pl === pr && pt === pl) {
      lines.push(`padding: ${pt}px;`);
    } else {
      lines.push(`padding: ${pt}px ${pr}px ${pb}px ${pl}px;`);
    }

    // Gap — only when explicitly set (non-null)
    if (node.itemSpacing != null) {
      lines.push(`gap: ${node.itemSpacing}px;`);
    }

    // Flex wrap
    if (node.layoutWrap === 'WRAP') {
      lines.push('flex-wrap: wrap;');
    }
  }

  // ── Position (only for root frame, matching Figma's export behavior) ──
  if (isRoot) {
    lines.push('');
    lines.push('position: relative;');
  }

  // ── Width / Height (no blank line before width in Figma export) ────────
  const box = node.absoluteBoundingBox;
  if (box) {
    if (box.width !== undefined) lines.push(`width: ${box.width}px;`);
    if (box.height !== undefined) lines.push(`height: ${box.height}px;`);
  }

  // Min/max sizes
  if (node.minWidth != null) lines.push(`min-width: ${node.minWidth}px;`);
  if (node.maxWidth != null) lines.push(`max-width: ${node.maxWidth}px;`);
  if (node.minHeight != null) lines.push(`min-height: ${node.minHeight}px;`);
  if (node.maxHeight != null) lines.push(`max-height: ${node.maxHeight}px;`);

  // ── Fills (Background / Text Color) ────────────────────────────────────
  if (node.fills?.length > 0) {
    const visibleFills = node.fills.filter((f) => f.visible !== false);
    for (const fill of visibleFills) {
      if (fill.type === 'SOLID' && fill.color) {
        const styleName = lookupStyleName(fill.color, fill.opacity);
        if (styleName) {
          lines.push('');
          lines.push(`/* ${styleName} */`);
        }
        const color = colorToHex(fill.color, fill.opacity);
        if (color) {
          lines.push(`${node.type === 'TEXT' ? 'color' : 'background'}: ${color};`);
        }
      } else if (fill.type?.startsWith('GRADIENT')) {
        let gradient = fill.type === 'GRADIENT_LINEAR' ? 'linear-gradient(' : 'radial-gradient(';
        if (fill.gradientHandlePositions?.length >= 2 && fill.type === 'GRADIENT_LINEAR') {
          const p1 = fill.gradientHandlePositions[0];
          const p2 = fill.gradientHandlePositions[1];
          const angle = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
          gradient += `${((450 - angle) % 360).toFixed(1)}deg, `;
        }
        if (fill.gradientStops) {
          gradient += fill.gradientStops
            .map((stop) => {
              const c = colorToHex(stop.color, stop.color?.a);
              const pos = stop.position != null ? ` ${Math.round(stop.position * 100)}%` : '';
              return `${c}${pos}`;
            })
            .join(', ');
        }
        gradient += ')';
        lines.push(`background: ${gradient};`);
      }
    }
  }

  // ── Strokes (Borders) ──────────────────────────────────────────────────
  if (node.strokes?.length > 0) {
    const visibleStrokes = node.strokes.filter((s) => s.visible !== false);
    if (visibleStrokes.length > 0) {
      const stroke = visibleStrokes[0];
      const strokeColor = colorToHex(stroke.color, stroke.opacity);
      const strokeWeight = node.strokeWeight ?? node.strokeWeightTop ?? 1;
      const strokeStyle = node.strokeDashes?.length > 0 ? 'dashed' : 'solid';

      const styleName = lookupStyleName(stroke.color, stroke.opacity);
      if (styleName) {
        lines.push('');
        lines.push(`/* ${styleName} */`);
      }

      const top = node.strokeWeightTop ?? strokeWeight;
      const right = node.strokeWeightRight ?? strokeWeight;
      const bottom = node.strokeWeightBottom ?? strokeWeight;
      const left = node.strokeWeightLeft ?? strokeWeight;

      if (top === right && top === bottom && top === left) {
        lines.push(`border: ${top}px ${strokeStyle} ${strokeColor};`);
      } else {
        if (top) lines.push(`border-top: ${top}px ${strokeStyle} ${strokeColor};`);
        if (right) lines.push(`border-right: ${right}px ${strokeStyle} ${strokeColor};`);
        if (bottom) lines.push(`border-bottom: ${bottom}px ${strokeStyle} ${strokeColor};`);
        if (left) lines.push(`border-left: ${left}px ${strokeStyle} ${strokeColor};`);
      }
    }
  }

  // ── Border Radius ──────────────────────────────────────────────────────
  if (node.cornerRadius != null && node.cornerRadius !== 0) {
    const tl = node.rectangleCornerRadii?.[0] ?? node.cornerRadius;
    const tr = node.rectangleCornerRadii?.[1] ?? node.cornerRadius;
    const br = node.rectangleCornerRadii?.[2] ?? node.cornerRadius;
    const bl = node.rectangleCornerRadii?.[3] ?? node.cornerRadius;
    if (tl === tr && tl === br && tl === bl) {
      lines.push(`border-radius: ${tl}px;`);
    } else {
      lines.push(`border-radius: ${tl}px ${tr}px ${br}px ${bl}px;`);
    }
  }

  // ── Effects (Shadows) ──────────────────────────────────────────────────
  const shadows =
    node.effects?.filter((e) => e.type === 'DROP_SHADOW' && e.visible !== false) ?? [];
  const innerShadows =
    node.effects?.filter((e) => e.type === 'INNER_SHADOW' && e.visible !== false) ?? [];
  if (shadows.length > 0 || innerShadows.length > 0) {
    const allShadows = [
      ...shadows.map((s) => {
        const c = colorToHex(s.color, s.color?.a ?? s.opacity ?? 1);
        return `${s.offset?.x ?? 0}px ${s.offset?.y ?? 0}px ${s.radius ?? 0}px ${s.spread ?? 0}px ${c}`;
      }),
      ...innerShadows.map((s) => {
        const c = colorToHex(s.color, s.color?.a ?? s.opacity ?? 1);
        return `inset ${s.offset?.x ?? 0}px ${s.offset?.y ?? 0}px ${s.radius ?? 0}px ${s.spread ?? 0}px ${c}`;
      }),
    ];
    lines.push(`box-shadow: ${allShadows.join(', ')};`);
  }

  // ── Opacity ────────────────────────────────────────────────────────────
  if (node.opacity != null && node.opacity < 1) {
    lines.push(`opacity: ${node.opacity};`);
  }

  // ── Typography (TEXT nodes) ────────────────────────────────────────────
  if (node.type === 'TEXT' && node.style) {
    const s = node.style;
    if (s.fontFamily) {
      lines.push('');
      lines.push(`font-family: '${s.fontFamily}';`);
    }
    if (s.fontStyle && s.fontStyle !== 'Normal') {
      lines.push(`font-style: ${s.fontStyle.toLowerCase()};`);
    }
    if (s.fontWeight) lines.push(`font-weight: ${s.fontWeight};`);
    if (s.fontSize) lines.push(`font-size: ${s.fontSize}px;`);
    if (s.lineHeightPercentFontSize) {
      lines.push(`line-height: ${s.lineHeightPercentFontSize}%;`);
      if (s.lineHeightPx) lines.push(`/* or ${s.lineHeightPx}px */`);
    } else if (s.lineHeightPx) {
      lines.push(`line-height: ${s.lineHeightPx}px;`);
    }
    if (s.letterSpacing) lines.push(`letter-spacing: ${s.letterSpacing}px;`);
    if (s.textAlignHorizontal && s.textAlignHorizontal !== 'LEFT') {
      const map = { CENTER: 'center', RIGHT: 'right', JUSTIFIED: 'justify' };
      if (map[s.textAlignHorizontal]) lines.push(`text-align: ${map[s.textAlignHorizontal]};`);
    }
    if (s.textCase === 'UPPER') lines.push('text-transform: uppercase;');
    else if (s.textCase === 'LOWER') lines.push('text-transform: lowercase;');
    else if (s.textCase === 'TITLE') lines.push('text-transform: capitalize;');
    if (s.textDecoration === 'UNDERLINE') lines.push('text-decoration: underline;');
    else if (s.textDecoration === 'STRIKETHROUGH') lines.push('text-decoration: line-through;');

    // Text content comment
    if (node.characters) {
      lines.push('');
      lines.push(`/* ${node.characters.replace(/\n/g, '\\n').substring(0, 120)} */`);
    }
  }

  // ── Isolation ──────────────────────────────────────────────────────────
  if (node.isolation === 'ISOLATE') {
    lines.push('isolation: isolate;');
  }

  // Push the main layer section
  if (lines.length > 1) {
    sections.push({ lines });
  }

  // ── Inside auto layout section ─────────────────────────────────────────
  // Represents how this node behaves as a child in its parent flex container
  if (node.layoutPosition !== 'ABSOLUTE') {
    const hasLayoutInfo = node.layoutGrow != null || node.layoutAlign;
    if (hasLayoutInfo) {
      insideLines.push('');
      insideLines.push('/* Inside auto layout */');

      // Figma always outputs flex: none as baseline, then overrides with flex-grow
      insideLines.push('flex: none;');
      insideLines.push('order: 0;');

      // flex-grow (overrides flex: none)
      if (node.layoutGrow != null && node.layoutGrow > 0) {
        insideLines.push(`flex-grow: ${node.layoutGrow};`);
      }

      // align-self
      if (node.layoutAlign && node.layoutAlign !== 'INHERIT') {
        const alignMap = {
          MIN: 'flex-start',
          CENTER: 'center',
          MAX: 'flex-end',
          STRETCH: 'stretch',
        };
        if (alignMap[node.layoutAlign]) {
          insideLines.push(`align-self: ${alignMap[node.layoutAlign]};`);
        }
      }

      if (insideLines.length > 2) {
        sections.push({ lines: insideLines, isInside: true });
      }
    }
  }

  // ── Process children (FLAT — no indentation, matching Figma export) ────
  if (node.children) {
    const prevRoot = isRoot;
    isRoot = false;
    node.children.forEach((child) => generateNodeCSS(child));
    isRoot = prevRoot;
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

// Extract root from various possible JSON structures
let root;
if (raw.nodes) {
  const firstKey = Object.keys(raw.nodes)[0];
  root = raw.nodes[firstKey]?.document || raw.nodes[firstKey];
} else {
  root = raw.document || raw;
}

generateNodeCSS(root);

// ─── Assemble Output ────────────────────────────────────────────────────────

const output = [];

// Header
output.push('/*');
output.push(' * Figma CSS Export (generated by generate-figma-css.mjs)');
output.push(' *');
output.push(' * Note: The figma-developer-mcp does NOT have a direct CSS download tool.');
output.push(' *       It only provides get_figma_data (JSON) and download_figma_images (PNG).');
output.push(' *       This CSS is generated from the Figma JSON data to mirror the');
output.push(' *       "Copy as Code → Copy All CSS" export format.');
output.push(` * Source: ${inputPath}`);
if (raw.name) output.push(` * Frame: ${raw.name}`);
output.push(' */');

for (const section of sections) {
  for (const line of section.lines) {
    output.push(line);
  }
}

output.push('');

const result = output.join('\n');

if (outputPath) {
  fs.writeFileSync(outputPath, result, 'utf8');
  console.error(`✅ CSS written to ${outputPath}`);
  console.error(`   ${sections.filter((s) => !s.isInside).length} layer rules generated`);
} else if (printStdout) {
  console.log(result);
}
