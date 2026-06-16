#!/usr/bin/env node

/**
 * compile-component-map.mjs
 *
 * Scans all `.stories.tsx` files for `@figma` and `@figma-layer` JSDoc
 * annotations and compiles them into a centralized mapping.
 *
 * Outputs:
 *   .tmp/figma-component-map.json   — machine-readable mapping
 *   docs/figma-component-map.md     — human-readable reference table
 *
 * Usage:
 *   node compile-component-map.mjs
 */

import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = process.cwd();

// ─── Configuration ──────────────────────────────────────────────────────────

const _STORIES_GLOB = 'src/**/*.stories.tsx';
const JSON_OUTPUT = '.tmp/figma-component-map.json';
const MD_OUTPUT = 'docs/figma-component-map.md';

// Patterns for @figma and @figma-layer annotations
const FIGMA_URL_RE = /@figma\s+(https?:\/\/[^\s*]+)/g;
const FIGMA_LAYER_RE = /@figma-layer\s+(.+?)\s*->\s*(.+)/g;

// ─── File Discovery ─────────────────────────────────────────────────────────

function findStoryFiles(dir) {
  const results = [];
  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.stories.tsx')) {
        results.push(fullPath);
      }
    }
  }
  walk(dir);
  return results;
}

// ─── Parsing ────────────────────────────────────────────────────────────────

function parseAnnotations(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  const entries = [];

  // Extract @figma URLs
  let match;
  while ((match = FIGMA_URL_RE.exec(content)) !== null) {
    entries.push({
      type: 'figma',
      value: match[1].trim(),
      file: relativePath,
    });
  }

  // Extract @figma-layer mappings
  while ((match = FIGMA_LAYER_RE.exec(content)) !== null) {
    entries.push({
      type: 'layer',
      layerName: match[1].trim(),
      componentPath: match[2].trim(),
      file: relativePath,
    });
  }

  return entries;
}

// ─── Component Path Resolution ──────────────────────────────────────────────

function resolveComponentPath(importPath) {
  // Handle @/ alias
  let resolved = importPath;
  if (resolved.startsWith('@/')) {
    resolved = resolved.replace('@/', path.join(PROJECT_ROOT, 'src/'));
  }
  // Handle relative paths (would need the source file context — skip for now)
  if (resolved.startsWith('.')) {
    return { resolved: null, isRelative: true };
  }

  // Check if it's 'self'
  if (resolved === 'self') {
    return { resolved: 'self', isSelf: true };
  }

  // Try with .tsx extension
  const withTsx = resolved.endsWith('.tsx') ? resolved : `${resolved}.tsx`;
  if (fs.existsSync(withTsx)) {
    return { resolved: withTsx, exists: true };
  }

  // Try as index file
  const asIndex = path.join(resolved, 'index.tsx');
  if (fs.existsSync(asIndex)) {
    return { resolved: asIndex, exists: true };
  }

  return { resolved: resolved, exists: false };
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  const storyFiles = findStoryFiles(path.join(PROJECT_ROOT, 'src'));

  console.error(`📁 Found ${storyFiles.length} story files`);

  // Parse all annotations
  const allEntries = [];
  for (const file of storyFiles) {
    const entries = parseAnnotations(file);
    allEntries.push(...entries);
  }

  console.error(`🔍 Found ${allEntries.length} Figma annotations`);

  // Separate figma URLs and layer mappings
  const figmaUrls = allEntries.filter((e) => e.type === 'figma');
  const layerMappings = allEntries.filter((e) => e.type === 'layer');

  // Build per-file mapping
  const fileMap = {};
  for (const entry of allEntries) {
    if (!fileMap[entry.file]) {
      fileMap[entry.file] = { figmaUrl: null, layers: [] };
    }
    if (entry.type === 'figma') {
      fileMap[entry.file].figmaUrl = entry.value;
    } else if (entry.type === 'layer') {
      fileMap[entry.file].layers.push({
        layerName: entry.layerName,
        componentPath: entry.componentPath,
      });
    }
  }

  // Validate component paths
  const warnings = [];
  const resolvedMappings = layerMappings.map((m) => {
    const resolved = resolveComponentPath(m.componentPath);
    if (!resolved.exists && !resolved.isRelative && !resolved.isSelf) {
      warnings.push(
        `⚠️  ${m.file}: layer "${m.layerName}" references "${m.componentPath}" — file not found on disk`,
      );
    }
    return {
      file: m.file,
      layerName: m.layerName,
      componentPath: m.componentPath,
      resolvedPath: resolved.resolved,
      exists: resolved.exists || resolved.isSelf || false,
    };
  });

  // Detect duplicate layer names
  const layerNameCounts = {};
  for (const m of resolvedMappings) {
    layerNameCounts[m.layerName] = (layerNameCounts[m.layerName] || 0) + 1;
  }
  for (const [name, count] of Object.entries(layerNameCounts)) {
    if (count > 1) {
      const files = resolvedMappings.filter((m) => m.layerName === name).map((m) => m.file);
      warnings.push(`⚠️  Duplicate layer name "${name}" found in: ${files.join(', ')}`);
    }
  }

  // ── Build JSON Output ──────────────────────────────────────────────────
  const jsonOutput = {
    generatedAt: new Date().toISOString(),
    totalFiles: Object.keys(fileMap).length,
    totalLayers: resolvedMappings.length,
    totalFigmaUrls: figmaUrls.length,
    files: fileMap,
    layers: resolvedMappings,
    warnings,
  };

  const jsonDir = path.dirname(JSON_OUTPUT);
  if (!fs.existsSync(jsonDir)) {
    fs.mkdirSync(jsonDir, { recursive: true });
  }
  fs.writeFileSync(JSON_OUTPUT, JSON.stringify(jsonOutput, null, 2), 'utf8');
  console.error(`✅ JSON map written to ${JSON_OUTPUT}`);

  // ── Build Markdown Output ──────────────────────────────────────────────
  const mdLines = [];
  mdLines.push('# Figma Component-to-Layer Map');
  mdLines.push('');
  mdLines.push(
    `> Auto-generated by \`compile-component-map.mjs\` on ${new Date().toISOString().split('T')[0]}`,
  );
  mdLines.push('>');
  mdLines.push(
    '> This file is the centralized lookup for which Figma layers map to which React components.',
  );
  mdLines.push(
    '> To update, edit the `@figma-layer` annotations in `.stories.tsx` files and re-run.',
  );
  mdLines.push('');
  mdLines.push('---');
  mdLines.push('');

  if (warnings.length > 0) {
    mdLines.push('## ⚠️ Warnings');
    mdLines.push('');
    for (const w of warnings) {
      mdLines.push(`- ${w}`);
    }
    mdLines.push('');
    mdLines.push('---');
    mdLines.push('');
  }

  mdLines.push('## Layer Mappings');
  mdLines.push('');
  mdLines.push('| File | Figma URL | Layer | Component |');
  mdLines.push('|------|-----------|-------|-----------|');

  for (const [file, data] of Object.entries(fileMap).sort()) {
    const url = data.figmaUrl ? `[Link](${data.figmaUrl})` : '—';
    if (data.layers.length === 0) {
      mdLines.push(`| \`${file}\` | ${url} | _(root)_ | _(self)_ |`);
    } else {
      for (const layer of data.layers) {
        mdLines.push(
          `| \`${file}\` | ${url} | \`${layer.layerName}\` | \`${layer.componentPath}\` |`,
        );
      }
    }
  }

  mdLines.push('');

  // Summary
  mdLines.push('## Summary');
  mdLines.push('');
  mdLines.push(`- **Files with Figma annotations:** ${Object.keys(fileMap).length}`);
  mdLines.push(`- **Total layer mappings:** ${resolvedMappings.length}`);
  mdLines.push(`- **Total Figma URLs:** ${figmaUrls.length}`);
  mdLines.push(`- **Warnings:** ${warnings.length}`);

  const mdDir = path.dirname(MD_OUTPUT);
  if (!fs.existsSync(mdDir)) {
    fs.mkdirSync(mdDir, { recursive: true });
  }
  fs.writeFileSync(MD_OUTPUT, mdLines.join('\n'), 'utf8');
  console.error(`✅ Markdown map written to ${MD_OUTPUT}`);

  // ── Summary ────────────────────────────────────────────────────────────
  if (warnings.length > 0) {
    console.error('');
    console.error('⚠️  Warnings:');
    for (const w of warnings) {
      console.error(`   ${w}`);
    }
  }

  console.error('');
  console.error(`📊 Summary:`);
  console.error(`   ${Object.keys(fileMap).length} files with Figma annotations`);
  console.error(`   ${resolvedMappings.length} layer-to-component mappings`);
  console.error(`   ${figmaUrls.length} Figma URLs referenced`);
  console.error(`   ${warnings.length} warnings`);
}

main();
