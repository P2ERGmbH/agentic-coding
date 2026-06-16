#!/usr/bin/env node

/**
 * @file scripts/github-sub-issue-helper.js
 * @description Helper utility for managing GitHub sub-issues and dependencies.
 * Resolves the issue GraphQL Node ID vs numerical database ID, wraps API version 2026-03-10,
 * and provides robust markdown fallback logic if the native GitHub features are unavailable.
 *
 * Usage:
 *   npx node scripts/github-sub-issue-helper.js add --parent <parent-number> --sub <sub-number>
 *   npx node scripts/github-sub-issue-helper.js dependency --dependent <dependent-number> --blocking <blocking-number>
 */

import { execFileSync, execSync } from 'child_process';

// Simple command-line parser
const args = process.argv.slice(2);
const command = args[0];

if (!command || (command !== 'add' && command !== 'dependency')) {
  console.error(`Usage:
  npx node scripts/github-sub-issue-helper.js add --parent <parent-number> --sub <sub-number>
  npx node scripts/github-sub-issue-helper.js dependency --dependent <dependent-number> --blocking <blocking-number>`);
  process.exit(1);
}

// Extract named parameters
const params = {};
for (let i = 1; i < args.length; i += 1) {
  if (args[i].startsWith('--') && args[i + 1]) {
    const key = args[i].slice(2);
    params[key] = args[i + 1];
    i += 1;
  }
}

/**
 * Executes a shell command and returns trimmed stdout.
 * @param {string} cmd
 * @returns {string}
 */
function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    throw new Error(error.stderr?.toString().trim() || error.message);
  }
}

/**
 * Fetches the repo owner and name.
 * @returns {{owner: string, repo: string}}
 */
function getRepoContext() {
  try {
    const repoJson = run('gh repo view --json owner,name');
    const repoData = JSON.parse(repoJson);
    return {
      owner: repoData.owner.login,
      repo: repoData.name,
    };
  } catch (_error) {
    console.error(
      'Error: Could not retrieve repository context. Make sure you are inside a git repository and authenticated with the gh CLI.',
    );
    process.exit(1);
  }
}

/**
 * Retrieves the numerical REST database ID of an issue.
 * @param {string} owner
 * @param {string} repo
 * @param {number|string} issueNumber
 * @returns {number}
 */
function getIssueDatabaseId(owner, repo, issueNumber) {
  try {
    const idStr = run(`gh api repos/${owner}/${repo}/issues/${issueNumber} --jq .id`);
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      throw new Error(`Returned ID "${idStr}" is not a valid number.`);
    }
    return id;
  } catch (error) {
    console.error(
      `Error: Failed to fetch REST Database ID for issue #${issueNumber}. Details: ${error.message}`,
    );
    process.exit(1);
  }
}

// Main Command Router
const { owner, repo } = getRepoContext();

if (command === 'add') {
  const parentNumber = params.parent;
  const subNumber = params.sub;

  if (!parentNumber || !subNumber) {
    console.error('Error: Both --parent and --sub parameters are required.');
    process.exit(1);
  }

  // Strictly validate that issue numbers are positive integers to prevent command injection
  if (!/^\d+$/.test(parentNumber) || !/^\d+$/.test(subNumber)) {
    console.error('Error: Both --parent and --sub parameters must be positive integers.');
    process.exit(1);
  }

  console.log(`\n--- Linking Sub-Issue #${subNumber} to Parent Issue #${parentNumber} ---`);
  console.log(`1. Resolving numerical REST Database ID of sub-issue #${subNumber}...`);
  const subDbId = getIssueDatabaseId(owner, repo, subNumber);
  console.log(`   -> Numerical ID: ${subDbId}`);

  console.log('2. Establishing native parent-child relationship via GitHub REST API...');
  try {
    // We send a JSON POST request where sub_issue_id is an integer (using -f)
    const result = run(`gh api \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2026-03-10" \
      --method POST \
      /repos/${owner}/${repo}/issues/${parentNumber}/sub_issues \
      -f sub_issue_id=${subDbId}`);

    console.log('✅ Native parent-child link established successfully!');
    console.log(result);
  } catch (error) {
    console.warn('\n⚠️ Native Sub-Issue API request failed or feature is unavailable.');
    console.warn(`Reason: ${error.message}`);
    console.log('\n3. Activating Robust Markdown Fallback Strategy...');

    // Fetch parent issue body
    let parentBody = '';
    try {
      parentBody = run(`gh issue view ${parentNumber} --json body --jq .body`);
    } catch (bodyError) {
      console.error(`Error: Could not fetch parent issue body. ${bodyError.message}`);
    }

    const checkboxString = `- [ ] #${subNumber}`;
    const checklistRegex = /##\s*Implementation\s*Progress|##\s*Tasks|##\s*Sub-tasks/i;
    const referenceRegex = new RegExp(`(?<!\\d)#${subNumber}(?!\\d)`);

    let updatedBody = parentBody;
    if (referenceRegex.test(parentBody)) {
      console.log(`   - Reference to #${subNumber} already exists in parent issue description.`);
    } else {
      if (checklistRegex.test(parentBody)) {
        console.log('   - Found Implementation Checklist header. Appending sub-task checkbox...');
        // Insert checkbox under the matched checklist section
        updatedBody = parentBody.replace(
          /(##\s*(?:Implementation\s*Progress|Tasks|Sub-tasks)[^\n]*\n)/i,
          `$1${checkboxString}\n`,
        );
      } else {
        console.log(
          '   - No explicit checklist header found. Appending to the end of parent description...',
        );
        updatedBody = `${parentBody}\n\n## Implementation Progress\n${checkboxString}`;
      }

      // Update parent issue body using execFileSync to avoid shell expansion of body content (such as backticks or dollar signs)
      try {
        execFileSync('gh', ['issue', 'edit', parentNumber, '--body', updatedBody], {
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        console.log('   - Parent issue description updated successfully with checkbox.');
      } catch (editError) {
        console.warn(
          `   - Failed to update parent description: ${editError.stderr?.toString().trim() || editError.message}`,
        );
      }
    }

    // Comment on parent and sub-issues for trace-link safety
    try {
      run(`gh issue comment ${parentNumber} --body "Sub-task linked (fallback): #${subNumber}"`);
      run(`gh issue comment ${subNumber} --body "Part of parent issue #${parentNumber}"`);
      console.log('   - Trace-link comments posted successfully on both issues.');
    } catch (commentError) {
      console.warn(`   - Failed to post fallback comments: ${commentError.message}`);
    }

    console.log('✅ Fallback strategy completed.');
  }
}

if (command === 'dependency') {
  const dependentNumber = params.dependent;
  const blockingNumber = params.blocking;

  if (!dependentNumber || !blockingNumber) {
    console.error('Error: Both --dependent and --blocking parameters are required.');
    process.exit(1);
  }

  // Strictly validate that issue numbers are positive integers to prevent command injection
  if (!/^\d+$/.test(dependentNumber) || !/^\d+$/.test(blockingNumber)) {
    console.error('Error: Both --dependent and --blocking parameters must be positive integers.');
    process.exit(1);
  }

  console.log(`\n--- Linking Dependency: #${dependentNumber} Blocked By #${blockingNumber} ---`);
  console.log(`1. Resolving numerical REST Database ID of blocking issue #${blockingNumber}...`);
  const blockingDbId = getIssueDatabaseId(owner, repo, blockingNumber);
  console.log(`   -> Numerical ID: ${blockingDbId}`);

  console.log('2. Establishing native dependency relation via GitHub REST API...');
  try {
    const result = run(`gh api \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2026-03-10" \
      --method POST \
      /repos/${owner}/${repo}/issues/${dependentNumber}/dependencies/blocked_by \
      -f issue_id=${blockingDbId}`);

    console.log('✅ Native blocking dependency established successfully!');
    console.log(result);
  } catch (error) {
    console.warn('\n⚠️ Native Dependency API request failed or feature is unavailable.');
    console.warn(`Reason: ${error.message}`);
    console.log('\n3. Activating Markdown Fallback Strategy...');

    try {
      run(`gh issue comment ${dependentNumber} --body "⚠️ **Blocked By:** #${blockingNumber}"`);
      run(`gh issue comment ${blockingNumber} --body "🔗 **Blocks:** #${dependentNumber}"`);
      console.log('   - Fallback dependency comments posted successfully on both issues.');
    } catch (commentError) {
      console.warn(`   - Failed to post fallback comments: ${commentError.message}`);
    }

    console.log('✅ Fallback strategy completed.');
  }
}
