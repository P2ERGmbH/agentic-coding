#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports, no-plusplus */

/**
 * Automates replying to and resolving GitHub PR review comment threads.
 * Uses the authenticated local `gh` CLI to interact with GitHub APIs.
 *
 * Usage:
 *   node skills/resolve-review/scripts/resolve_comments.js <PR_NUMBER> <MAPPINGS_JSON_FILE>
 *
 * The Mappings JSON file should map either the comment databaseId or a substring of the comment body to the reply text.
 * Example mappings.json:
 * {
 *   "3287752042": "✅ Resolved in abc123a. Updated string concatenation to template literals.",
 *   "JSDoc": "✅ Resolved in xyz789b. Restored all JSDoc examples."
 * }
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for elegant logging
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    log('Usage: node resolve_comments.js <PR_NUMBER> <MAPPINGS_JSON_FILE>', colors.red);
    process.exit(1);
  }

  const prNumber = parseInt(args[0], 10);
  const mappingsPath = path.resolve(args[1]);

  if (isNaN(prNumber)) {
    log(`Error: Invalid PR number "${args[0]}"`, colors.red);
    process.exit(1);
  }

  if (!fs.existsSync(mappingsPath)) {
    log(`Error: Mappings file not found at "${mappingsPath}"`, colors.red);
    process.exit(1);
  }

  let mappings;
  try {
    mappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
  } catch (err) {
    log(`Error parsing mappings JSON: ${err.message}`, colors.red);
    process.exit(1);
  }

  log(
    `🚀 Starting PR comment resolution for PR #${colors.bold}${prNumber}${colors.blue}...`,
    colors.blue,
  );

  // 1. Get Owner and Repo name using git remote config
  let owner, repo;
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    // Handles formats like git@github.com:your-org/your-repo.git or https://github.com/your-org/your-repo.git
    const match = remoteUrl.match(/[:/]([^/]+)\/([^/.]+)(?:\.git)?$/);
    if (!match) {
      throw new Error(`Could not parse owner and repo from remote URL: ${remoteUrl}`);
    }
    owner = match[1];
    repo = match[2];
    log(`📦 Target Repository: ${colors.bold}${owner}/${repo}`, colors.cyan);
  } catch (err) {
    log(`Error retrieving repository information: ${err.message}`, colors.red);
    process.exit(1);
  }

  // 2. Fetch active review threads via GraphQL
  log(`🔍 Fetching review threads from GitHub...`, colors.cyan);
  let threadsResponse;
  try {
    const query = `query($o:String!,$r:String!,$p:Int!){repository(owner:$o,name:$r){pullRequest(number:$p){reviewThreads(first:100){nodes{id,isResolved,comments(first:50){nodes{databaseId,body,author{login}}}}}}}}`;
    const command = `gh api graphql -f query='${query}' -f o="${owner}" -f r="${repo}" -F p=${prNumber}`;
    const result = execSync(command, { encoding: 'utf8' });
    threadsResponse = JSON.parse(result);
  } catch (err) {
    log(`Error querying review threads via GraphQL: ${err.message}`, colors.red);
    process.exit(1);
  }

  const threads = threadsResponse?.data?.repository?.pullRequest?.reviewThreads?.nodes || [];
  const unresolvedThreads = threads.filter((t) => !t.isResolved);

  log(
    `Found ${colors.bold}${threads.length}${colors.cyan} total threads (${colors.bold}${unresolvedThreads.length}${colors.yellow} unresolved).`,
    colors.cyan,
  );

  if (unresolvedThreads.length === 0) {
    log(`✅ All comments are already resolved. No actions needed.`, colors.green);
    process.exit(0);
  }

  let matchedAndResolved = 0;

  // 3. Process each unresolved thread
  for (const thread of unresolvedThreads) {
    const threadId = thread.id;
    // Get the first comment in the thread to map and reply to
    const firstComment = thread.comments?.nodes?.[0];
    if (!firstComment) continue;

    const { databaseId, body, author } = firstComment;
    const authorName = author?.login || 'unknown';

    // Find if we have a mapping matching either the databaseId or a substring of the comment body
    let matchKey = null;
    let replyText = null;

    // Check direct database ID match first
    if (mappings[databaseId]) {
      matchKey = databaseId.toString();
      replyText = mappings[databaseId];
    } else {
      // Check substring matches
      for (const [key, val] of Object.entries(mappings)) {
        if (body.toLowerCase().includes(key.toLowerCase())) {
          matchKey = key;
          replyText = val;
          break;
        }
      }
    }

    if (replyText) {
      log(`\n----------------------------------------`, colors.blue);
      log(`Found match for key: "${colors.bold}${matchKey}${colors.cyan}"`, colors.cyan);
      log(
        `Original comment by @${authorName} (ID: ${databaseId}):\n  "${body.split('\n')[0]}..."`,
        colors.yellow,
      );
      log(`Action: Replying and resolving thread...`, colors.cyan);

      try {
        // A. Post reply
        const replyCommand = `gh api repos/${owner}/${repo}/pulls/${prNumber}/comments/${databaseId}/replies -f body="${replyText.replace(/"/g, '\\"')}"`;
        execSync(replyCommand, { stdio: 'ignore' });
        log(`  ↳ Reply posted successfully!`, colors.green);

        // B. Resolve thread
        const resolveMutation = `mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}`;
        const resolveCommand = `gh api graphql -f query='${resolveMutation}' -f id="${threadId}"`;
        execSync(resolveCommand, { stdio: 'ignore' });
        log(`  ↳ Thread resolved successfully!`, colors.green);

        matchedAndResolved++;
      } catch (err) {
        log(`  ❌ Error resolving thread: ${err.message}`, colors.red);
      }
    } else {
      log(
        `\n⚠️ No mapping match found for thread (ID: ${databaseId}) by @${authorName}:`,
        colors.yellow,
      );
      log(`  "${body.split('\n')[0]}..."`, colors.yellow);
    }
  }

  log(`\n========================================`, colors.blue);
  log(
    `🎉 Process finished. Successfully matched and resolved ${colors.bold}${matchedAndResolved}/${unresolvedThreads.length}${colors.green} unresolved threads.`,
    colors.green,
  );
}

main();
