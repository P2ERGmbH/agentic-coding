#!/usr/bin/env node

/**
 * parse-figma-vars.mjs
 *
 * Parses a Figma JSON export and outputs an annotated tree view with
 * Tailwind CSS utility classes for every node.
 *
 * Usage:
 *   node parse-figma-vars.mjs <input.json>                    # Tailwind tree to stdout
 *   node parse-figma-vars.mjs <input.json> --css              # Also emit CSS to <input>.css
 *   node parse-figma-vars.mjs <input.json> --css <output.css> # Also emit CSS to <output.css>
 */

import fs from 'fs';
import path from 'path';

const inputPath = process.argv[2];
const cssFlag = process.argv.includes('--css');

if (!inputPath) {
  console.error('Usage: node parse-figma-vars.mjs <input.json> [--css [output.css]]');
  process.exit(1);
}

const d = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

// Centralized Configuration Loader
let config = { theme: { colors: {}, typography: {}, shadows: {} }, settings: { fallbackStrategy: 'arbitrary' } };
const userConfigPath = path.join(process.cwd(), 'figma-to-tailwind.config.json');
const defaultConfigPath = path.join(path.dirname(new URL(import.meta.url).pathname), 'figma-to-tailwind.config.json');

const configPath = fs.existsSync(userConfigPath) ? userConfigPath : defaultConfigPath;

if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.error(`⚙️  Loaded configuration from ${configPath}`);
  } catch (err) {
    console.error(`⚠️  Failed to parse config at ${configPath}. Using defaults. Error: ${err.message}`);
  }
} else {
  console.error(`ℹ️  No figma-to-tailwind config found. Falling back to default JIT arbitrary values.`);
}

/**
 * Context-aware Color Mapping Engine
 * Maps an RGBA design token to a theme color class based on layout context.
 */
function mapColor(fillString, context = 'bg') {
  const normalizedKey = fillString.replace(/\s+/g, '');
  const colorEntry = config.theme.colors[normalizedKey];
  
  if (colorEntry) {
    if (typeof colorEntry === 'string') {
      return colorEntry;
    }
    return colorEntry[context] || colorEntry['bg'] || colorEntry['text'];
  }
  
  if (config.settings.fallbackStrategy === 'arbitrary') {
    return context === 'text' ? `text-[${fillString}]` : `bg-[${fillString}]`;
  }
  return '';
}

function parseFills(fills) {
  if (!fills || fills.length === 0) return null;
  const fill = fills[0];
  if (fill.type === 'SOLID' && fill.color) {
    const r = Math.round(fill.color.r * 255);
    const g = Math.round(fill.color.g * 255);
    const b = Math.round(fill.color.b * 255);
    const a =
      fill.opacity !== undefined ? fill.opacity : fill.color.a !== undefined ? fill.color.a : 1;
    return `rgba(${r},${g},${b},${a})`;
  }
  return null;
}

// Collect all nodes for CSS generation
const allNodes = [];

function dumpNode(node, depth = 0) {
  if (!node) return;
  const indent = '  '.repeat(depth);
  let details = [];

  // 1. Parse Auto-Layout
  if (node.layoutMode) {
    details.push('flex');
    details.push(node.layoutMode === 'VERTICAL' ? 'flex-col' : 'flex-row');

    // Gap
    if (node.itemSpacing) details.push(`gap-[${node.itemSpacing}px]`);

    // Padding
    const pt = node.paddingTop || 0;
    const pb = node.paddingBottom || 0;
    const pl = node.paddingLeft || 0;
    const pr = node.paddingRight || 0;
    if (pt === pb && pl === pr && pt === pl && pt !== 0) {
      details.push(`p-[${pt}px]`);
    } else {
      if (pt !== 0 || pb !== 0) details.push(`py-[${pt}px]`);
      if (pl !== 0 || pr !== 0) details.push(`px-[${pl}px]`);
    }

    // Alignment
    if (node.counterAxisAlignItems === 'CENTER') details.push('items-center');
    if (node.counterAxisAlignItems === 'STRETCH') details.push('items-stretch');
    if (node.counterAxisAlignItems === 'FLEX_END') details.push('items-end');
    if (node.primaryAxisAlignItems === 'SPACE_BETWEEN') details.push('justify-between');
    if (node.primaryAxisAlignItems === 'SPACE_AROUND') details.push('justify-around');
    if (node.primaryAxisAlignItems === 'SPACE_EVENLY') details.push('justify-evenly');
    if (node.primaryAxisAlignItems === 'CENTER') details.push('justify-center');
    if (node.primaryAxisAlignItems === 'FLEX_END') details.push('justify-end');
    if (node.layoutWrap === 'WRAP') details.push('flex-wrap');
  }

  // 2. Parse Stroke / Borders
  if (node.strokes && node.strokes.length > 0) {
    const strokeWidth = node.strokeWeight || 1;
    details.push(`border border-[${strokeWidth}px]`);
  }

  // 3. Parse Effects (Shadows)
  if (node.effects && node.effects.length > 0) {
    const hasShadow = node.effects.some((e) => e.type === 'DROP_SHADOW' && e.visible !== false);
    if (hasShadow) details.push('shadow-100');
  }

  // 4. Parse Rounded Corners
  if (node.cornerRadius !== undefined && node.cornerRadius !== 0) {
    details.push(`rounded-[${node.cornerRadius}px]`);
  }

  // 5. Parse Typography
  if (node.type === 'TEXT' && node.style) {
    const style = node.style;
    if (style.fontSize) details.push(`text-[${style.fontSize}px]`);
    if (style.fontWeight) details.push(`font-[${style.fontWeight}]`);
    if (style.lineHeightPx) details.push(`leading-[${Math.round(style.lineHeightPx)}px]`);
    if (style.letterSpacing) details.push(`tracking-[${style.letterSpacing}px]`);
    if (style.textCase === 'UPPER') details.push('uppercase');
  }

  // 6. Context-Aware Color Parsing & CSS Custom Property Alignment
  const fillRaw = parseFills(node.fills);
  if (fillRaw) {
    const context = node.type === 'TEXT' ? 'text' : 'bg';
    const token = mapColor(fillRaw, context);
    if (token) {
      if (token.startsWith('bg-') || token.startsWith('text-')) {
        details.push(token);
      } else {
        details.push(`${context}-${token}`);
      }
    }
  }

  // 7. Opacity
  if (node.opacity !== undefined && node.opacity !== null && node.opacity < 1) {
    details.push(`opacity-[${node.opacity}]`);
  }

  if (node.characters) {
    details.push(`TEXT: "${node.characters.replace(/\n/g, '\\n')}"`);
  }

  // Add size info
  if (node.absoluteBoundingBox) {
    const w = node.absoluteBoundingBox.width;
    const h = node.absoluteBoundingBox.height;
    if (w && h) details.push(`[${w}×${h}px]`);
  }

  console.log(`${indent}- [${node.type}] ${node.name}: ${details.join(' ')}`);

  // Collect for CSS generation
  allNodes.push(node);

  if (node.children) {
    node.children.forEach((c) => dumpNode(c, depth + 1));
  }
}

// Support both single nodes and files with nodes index
if (d.nodes) {
  for (const key of Object.keys(d.nodes)) {
    dumpNode(d.nodes[key].document || d.nodes[key], 0);
  }
} else {
  dumpNode(d.document || d, 0);
}

// ─── Optional CSS Output ────────────────────────────────────────────────────

if (cssFlag) {
  const cssIndex = process.argv.indexOf('--css');
  const cssOutputPath =
    process.argv[cssIndex + 1] && !process.argv[cssIndex + 1].startsWith('--')
      ? process.argv[cssIndex + 1]
      : inputPath.replace(/\.json$/, '') + '.css';

  // Dynamically import the CSS generator and run it
  const cssGenerator = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    'generate-figma-css.mjs',
  );

  const { spawnSync } = await import('child_process');
  const result = spawnSync('node', [cssGenerator, inputPath, cssOutputPath], {
    stdio: 'inherit',
  });

  if (result.status === 0) {
    console.error(`\n📄 CSS also written to ${cssOutputPath}`);
  } else {
    console.error(`\n⚠️  CSS generation failed (exit code ${result.status})`);
  }
}
