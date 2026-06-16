#!/usr/bin/env node

/**
 * Interactive project setup script for agentic rulesets and skill templates.
 * Generates/updates configurations (primary in package.json under "agents" key,
 * fallback in docs/project.json), updates .env with required tokens,
 * and configures MCP server settings for the chosen CLI.
 *
 * Runs entirely with zero external NPM dependencies!
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper for colored console outputs
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function ask(question, defaultValue = '') {
  return new Promise((resolve) => {
    const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

/**
 * Appends or updates environment variables in .env file without destroying other variables.
 */
function updateEnv(vars) {
  const envPath = path.resolve(process.cwd(), '.env');
  let currentContent = '';
  if (fs.existsSync(envPath)) {
    currentContent = fs.readFileSync(envPath, 'utf8');
  }

  const lines = currentContent.split('\n');
  for (const [key, val] of Object.entries(vars)) {
    if (!val) continue; // Skip empty tokens
    const varPattern = new RegExp(`^${key}=`);
    const existingIndex = lines.findIndex((l) => varPattern.test(l));
    if (existingIndex !== -1) {
      lines[existingIndex] = `${key}="${val}"`;
    } else {
      lines.push(`${key}="${val}"`);
    }
  }

  fs.writeFileSync(envPath, lines.join('\n').trim() + '\n', 'utf8');
  log(`✅ Updated environment variables in .env`, colors.green);
}

/**
 * Configures the MCP servers based on the chosen CLI.
 */
function configureMcp(cli, githubToken, figmaToken) {
  const mcpConfig = {
    mcpServers: {
      'figma-developer-mcp': {
        command: 'npx',
        args: ['-y', 'figma-developer-mcp', '--stdio'],
        env: {
          FIGMA_API_KEY: figmaToken || 'YOUR_FIGMA_TOKEN',
        },
      },
      github: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        env: {
          GITHUB_PERSONAL_ACCESS_TOKEN: githubToken || 'YOUR_GITHUB_TOKEN',
        },
      },
      'next-devtools': {
        command: 'node',
        args: ['node_modules/next-devtools-mcp/dist/index.js'],
      },
      'chrome-devtools': {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-chrome-devtools'],
      },
      terraform: {
        command: 'npx',
        args: ['-y', '-q', 'terraform-mcp-server'],
      },
    },
  };

  if (cli === 'cline') {
    const vscodeDir = path.resolve(process.cwd(), '.vscode');
    if (!fs.existsSync(vscodeDir)) {
      fs.mkdirSync(vscodeDir, { recursive: true });
    }
    const clineConfigPath = path.join(vscodeDir, 'cline_mcp_settings.json');
    mcpConfig.mcpServers.github.disabled = false;
    mcpConfig.mcpServers['chrome-devtools'].disabled = false;
    fs.writeFileSync(clineConfigPath, JSON.stringify(mcpConfig, null, 2), 'utf8');
    log(`✅ Generated Cline MCP configuration at .vscode/cline_mcp_settings.json`, colors.green);
  } else if (cli === 'qwen' || cli === 'opencode') {
    const dirName = cli === 'qwen' ? '.qwen' : '.opencode';
    const targetDir = path.resolve(process.cwd(), dirName);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Complete configuration schema for Qwen / OpenCode
    const fullConfig = {
      mcpServers: mcpConfig.mcpServers,
      permissions: {
        allow: [
          "Bash(gh *)",
          "Bash(sleep *)",
          "WebFetch(github.com)",
          "Bash(git checkout *)",
          "Bash(find *)",
          "Bash(npx *)",
          "Bash(node *)",
          "Agent(Explore)"
        ]
      },
      "$version": 4,
      "model": {
        "name": "gemini-3.5-flash"
      },
      "modelProviders": {
        "gemini": [
          {
            "id": "gemini-3.1-pro-preview",
            "name": "Gemini 3.1 Pro Preview",
            "envKey": "GEMINI_API_KEY",
            "baseUrl": "https://generativelanguage.googleapis.com",
            "capabilities": {
              "vision": true
            },
            "generationConfig": {
              "timeout": 60000,
              "maxRetries": 3,
              "contextWindowSize": 1000000,
              "schemaCompliance": "auto"
            }
          },
          {
            "id": "gemini-3.5-flash",
            "name": "Gemini 3.5 Flash",
            "envKey": "GEMINI_API_KEY",
            "baseUrl": "https://generativelanguage.googleapis.com",
            "capabilities": {
              "vision": true
            },
            "generationConfig": {
              "timeout": 60000,
              "maxRetries": 3,
              "contextWindowSize": 1048576,
              "schemaCompliance": "auto"
            }
          }
        ]
      },
      "security": {
        "auth": {
          "selectedType": "gemini"
        }
      }
    };
    
    const settingsPath = path.join(targetDir, 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(fullConfig, null, 2) + '\n', 'utf8');
    log(`✅ Generated ${cli === 'qwen' ? 'Qwen' : 'OpenCode'} settings at ${dirName}/settings.json`, colors.green);

    // Auto-generate relative symlinks to skills folder if they don't exist
    const symlinkTarget = path.join(targetDir, 'skills');
    if (!fs.existsSync(symlinkTarget)) {
      try {
        fs.symlinkSync('../.agents/skills', symlinkTarget, 'dir');
        log(`🔗 Created relative symlink for skills in ${dirName}/`, colors.cyan);
      } catch (e) {
        log(`⚠️ Could not create symlink for skills in ${dirName}/: ${e.message}`, colors.yellow);
      }
    }
  } else {
    const agentsDir = path.resolve(process.cwd(), '.agents');
    if (!fs.existsSync(agentsDir)) {
      fs.mkdirSync(agentsDir, { recursive: true });
    }
    const mcpConfigPath = path.join(agentsDir, 'mcp_config.json');
    fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2), 'utf8');
    log(`✅ Generated Antigravity/Gemini MCP configuration at .agents/mcp_config.json`, colors.green);
  }
}

/**
 * Automatically detects the project's folder structure for source, components, types, database, app pages, and server actions.
 */
function detectPaths(currentProject = {}) {
  const paths = {
    src: currentProject.paths?.src || 'src',
    types: currentProject.paths?.types || 'src/types',
    components: currentProject.paths?.components || 'src/components',
    db: currentProject.paths?.db || 'src/lib/db',
    actions: currentProject.paths?.actions || 'src/actions',
    app: currentProject.paths?.app || 'src/app',
  };

  // 1. Detect if src directory exists, otherwise fallback to root '.'
  if (!fs.existsSync(path.resolve(process.cwd(), 'src'))) {
    paths.src = '.';
  }

  // Helper to search for directory options
  const findDir = (options, defaultVal) => {
    for (const opt of options) {
      const relativePath = paths.src === '.' ? opt : path.join(paths.src, opt);
      const fullPath = path.resolve(process.cwd(), relativePath);
      if (fs.existsSync(fullPath)) {
        return relativePath;
      }
    }
    return defaultVal;
  };

  paths.types = findDir(['types', 'interfaces'], paths.src === '.' ? 'types' : 'src/types');
  paths.components = findDir(['components', 'ui'], paths.src === '.' ? 'components' : 'src/components');
  paths.db = findDir(['lib/db', 'db', 'database', 'prisma', 'models'], paths.src === '.' ? 'db' : 'src/lib/db');
  paths.actions = findDir(['actions', 'server-actions'], paths.src === '.' ? 'actions' : 'src/actions');
  paths.app = findDir(['app', 'pages'], paths.src === '.' ? 'app' : 'src/app');

  return paths;
}

/**
 * Helper to extract git owner and repository from package.json repository url.
 */
function parseRepoUrl(repoField) {
  if (!repoField) return { owner: '', repo: '' };
  const url = typeof repoField === 'string' ? repoField : repoField.url || '';
  if (!url) return { owner: '', repo: '' };

  // Match formats: "git+https://github.com/org/repo.git", "git@github.com:org/repo.git", "org/repo"
  const match = url.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?$/) || url.match(/^([^/]+)\/([^/]+)$/);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }
  return { owner: '', repo: '' };
}

async function main() {
  log('\n========================================', colors.blue);
  log('🛠️  Agentic Coding Workspace Setup Wizard 🛠️', colors.blue + colors.bold);
  log('========================================\n', colors.blue);

  // 1. Check if package.json exists (Primary configuration database)
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  const projectJsonPath = path.resolve(process.cwd(), 'docs/project.json');
  let hasPackageJson = false;
  let packageJsonData = null;
  let currentProject = {};

  if (fs.existsSync(packageJsonPath)) {
    try {
      packageJsonData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      hasPackageJson = true;
      currentProject = packageJsonData.agents || {};
      log('📦 Next.js package.json detected! Using it as the primary config store.', colors.cyan);
    } catch (e) {
      log('⚠️ Could not parse existing package.json, falling back to docs/project.json.', colors.yellow);
    }
  }

  // Load docs/project.json as fallback if not using package.json or if package.json is missing the agents block
  if (!hasPackageJson || !packageJsonData.agents) {
    if (fs.existsSync(projectJsonPath)) {
      try {
        currentProject = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
        log('📋 Loaded fallback configuration from docs/project.json', colors.cyan);
      } catch (e) {
        // Ignore parsing errors, default to empty
      }
    }
  }

  // 2. Choose CLI
  log('\nStep 1: Choose your active Agentic CLI / Environment', colors.cyan);
  log('Available options: agy, gemini, qwen, cline, opencode');
  const cli = (await ask('Your chosen CLI', 'agy')).toLowerCase();

  // 3. Project Metadata
  log('\nStep 2: Define Project and Repository Metadata', colors.cyan);
  const parsed = hasPackageJson ? parseRepoUrl(packageJsonData.repository) : { owner: '', repo: '' };
  
  const defaultOrg = currentProject.organization || parsed.owner || 'your-org';
  const defaultRepo = currentProject.repository || parsed.repo || 'your-repo';
  const defaultProj = currentProject.projectName || (hasPackageJson ? packageJsonData.name : null) || defaultRepo;

  const projectName = await ask('Project Name', defaultProj);
  const organization = await ask('GitHub Organization / Owner', defaultOrg);
  const repository = await ask('GitHub Repository Name', defaultRepo);

  // 4. Define Stakeholders
  log('\nStep 3: Define Stakeholders for Reviews and Mentions (prefixed with @)', colors.cyan);
  const defaultPm = currentProject.stakeholders?.productManager || '@pm-username';
  const defaultDev = currentProject.stakeholders?.seniorDeveloper || '@senior-dev-username';
  const defaultQa = currentProject.stakeholders?.qaLead || '@qa-username';
  const defaultArch = currentProject.stakeholders?.techArchitect || '@architect-username';

  let pm = await ask('Product Manager GitHub Username', defaultPm);
  let dev = await ask('Senior Developer GitHub Username', defaultDev);
  let qa = await ask('QA Lead GitHub Username', defaultQa);
  let arch = await ask('Tech Architect GitHub Username', defaultArch);

  // Normalize stakeholders with '@' prefix
  const ensureAt = (u) => (u && !u.startsWith('@') ? `@${u}` : u);
  pm = ensureAt(pm);
  dev = ensureAt(dev);
  qa = ensureAt(qa);
  arch = ensureAt(arch);

  // 5. Domains and Environments
  log('\nStep 4: Configure Page Domains and Local Port', colors.cyan);
  const defaultProd = currentProject.environments?.production || 'https://your-domain.com';
  const defaultDevEnv = currentProject.environments?.development || 'https://dev.your-domain.com';
  const defaultPort = currentProject.environments?.localPort || 6767;
  const defaultPrPreview = currentProject.environments?.prPreview || '';

  const production = await ask('Production URL', defaultProd);
  const development = await ask('Development Environment URL', defaultDevEnv);
  const localPort = parseInt(await ask('Local Dev Server Port', defaultPort.toString()), 10);

  log('\nConfigure PR Preview Environment:', colors.blue);
  const usePrPreview = (await ask('Does your project use dynamic PR Preview environments? (y/n)', defaultPrPreview ? 'y' : 'n')).toLowerCase() === 'y';
  let prPreview = '';
  if (usePrPreview) {
    prPreview = await ask('PR Preview URL template (e.g. https://[PR-SLOT].your-domain.com/)', defaultPrPreview || 'https://[PR-SLOT].your-domain.com/');
  }

  // 6. Detect and Configure Project Paths
  log('\nStep 5: Detect and Configure Project Paths', colors.cyan);
  const detectedPaths = detectPaths(currentProject);
  log('We have auto-detected your project folder structure. Please confirm or customize:');
  const pathSrc = await ask('Source directory (e.g. src or .)', detectedPaths.src);
  const pathTypes = await ask('Types/Interfaces directory', detectedPaths.types);
  const pathComponents = await ask('Components/UI directory', detectedPaths.components);
  const pathDb = await ask('Database/Schema directory', detectedPaths.db);
  const pathActions = await ask('Server Actions directory', detectedPaths.actions);
  const pathApp = await ask('App/Pages/Routes directory', detectedPaths.app);

  const paths = {
    src: pathSrc,
    types: pathTypes,
    components: pathComponents,
    db: pathDb,
    actions: pathActions,
    app: pathApp,
  };

  // 7. Gather Credentials & Tokens
  log('\nStep 6: Configure Integration Tokens', colors.cyan);
  log('We will store these securely in your local gitignored .env file.');

  let existingGithubToken = '';
  let existingFigmaToken = '';
  if (fs.existsSync(path.resolve(process.cwd(), '.env'))) {
    const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
    const githubMatch = envContent.match(/^GITHUB_TOKEN=["']?([^"'\n]+)/m);
    const figmaMatch = envContent.match(/^FIGMA_TOKEN=["']?([^"'\n]+)/m);
    if (githubMatch) existingGithubToken = githubMatch[1];
    if (figmaMatch) existingFigmaToken = figmaMatch[1];
  }

  const githubToken = await ask('GitHub Personal Access Token (PAT)', existingGithubToken);
  const figmaToken = await ask('Figma Personal Access Token (Token)', existingFigmaToken);

  // 8. Configure Quality Gates
  log('\nStep 7: Configure Optional Chrome DevTools Automated Quality Gates', colors.cyan);
  const qgEnabled = (await ask('Enable automated Quality Gates (y/n)', 'y')).toLowerCase() === 'y';

  let qualityGates = { enabled: false };

  if (qgEnabled) {
    log('\nConfigure Accessibility (a11y) Gate:', colors.blue);
    const a11yEnabled = (await ask('Enable Accessibility Gate (y/n)', 'y')).toLowerCase() === 'y';
    const a11yRoutesInput = await ask('Target routes to audit (comma-separated)', '/, /dashboard');
    const a11yRoutes = a11yRoutesInput.split(',').map((r) => r.trim()).filter(Boolean);

    log('\nConfigure Performance (LCP) Gate:', colors.blue);
    const perfEnabled = (await ask('Enable Performance (LCP) Gate (y/n)', 'y')).toLowerCase() === 'y';
    const maxLcp = parseFloat(await ask('Max LCP threshold (seconds)', '2.5'));

    log('\nConfigure Memory Leak Detection Gate:', colors.blue);
    const memEnabled = (await ask('Enable Memory Leak Gate (y/n)', 'n')).toLowerCase() === 'y';

    qualityGates = {
      enabled: true,
      a11y: {
        enabled: a11yEnabled,
        routes: a11yRoutes,
        maxViolations: 0,
        colorContrastCheck: true,
      },
      performance: {
        enabled: perfEnabled,
        routes: a11yRoutes.slice(0, 1),
        maxLcpSeconds: maxLcp,
        cpuThrottling: 4,
        networkProfile: 'Fast 3G',
      },
      memory: {
        enabled: memEnabled,
        scenarios: memEnabled ? [
          {
            name: 'Generic Navigation Leak Check',
            routes: ['/', '/dashboard', '/'],
            iterations: 5,
            maxMemoryDeltaMB: 5.0,
          }
        ] : [],
      },
    };
  }

  // 7. Write Configuration Files
  log('\n💾 Writing configuration files...', colors.blue);

  const projectConfig = {
    projectName,
    organization,
    repository,
    stakeholders: {
      productManager: pm,
      seniorDeveloper: dev,
      qaLead: qa,
      techArchitect: arch,
    },
    environments: {
      production,
      development,
      localPort,
      prPreview,
    },
    paths,
    qualityGates,
  };

  if (hasPackageJson) {
    // Write configuration directly into package.json under the "agents" key
    packageJsonData.agents = projectConfig;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonData, null, 2) + '\n', 'utf8');
    log(`✅ Saved workspace configurations directly to package.json under "agents" key`, colors.green);
    
    // Clean up docs/project.json if it exists to prevent duplication
    if (fs.existsSync(projectJsonPath)) {
      fs.unlinkSync(projectJsonPath);
      log(`🧹 Removed redundant docs/project.json to maintain a single source of truth in package.json`, colors.yellow);
    }
  } else {
    // Write docs/project.json as fallback
    const docsDir = path.resolve(process.cwd(), 'docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    fs.writeFileSync(projectJsonPath, JSON.stringify(projectConfig, null, 2) + '\n', 'utf8');
    log(`✅ Generated fallback configuration file at docs/project.json`, colors.green);
  }

  // Update .env with tokens
  updateEnv({
    GITHUB_TOKEN: githubToken,
    FIGMA_TOKEN: figmaToken,
  });

  // Configure MCP settings
  configureMcp(cli, githubToken, figmaToken);

  log('\n========================================', colors.green);
  log('🎉 Setup Completed Successfully! 🎉', colors.green + colors.bold);
  log('========================================', colors.green);
  if (hasPackageJson) {
    log(`- Read and verify your project details directly in your package.json`);
  } else {
    log(`- Read and verify your project details in: docs/project.json`);
  }
  log(`- Tokens and local parameters are safe in: .env`);
  if (cli === 'cline') {
    log(`- Load your MCP servers inside VS Code with Cline.`);
  } else if (cli === 'qwen') {
    log(`- Load your settings and MCP servers in Qwen CLI.`);
  } else if (cli === 'opencode') {
    log(`- Load your settings and MCP servers in OpenCode.`);
  } else {
    log(`- Run 'agy mcp reload' or restart Gemini CLI to initialize MCP servers.`);
  }
  log('\nHappy agentic coding! 🚀\n');

  rl.close();
}

main().catch((err) => {
  log(`\n❌ Setup failed: ${err.message}`, colors.red);
  rl.close();
  process.exit(1);
});
