#!/usr/bin/env node
// Provider consent lives in PR labels, not in local quota guesses or amendments.
import {execFileSync} from 'node:child_process';
const git = (...args) => execFileSync('git', args, {encoding: 'utf8'}).trim();
const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
if (branch === 'main' || branch === 'master' || branch.startsWith('preview/')) {
  throw new Error('This helper only pushes ordinary PR branches.');
}
if (!git('log', '-1', '--pretty=%B').startsWith('[CF-Pages-Skip]')) {
  throw new Error('Commit must begin [CF-Pages-Skip]. No amendment or push performed.');
}
console.log('No automatic preview consent or provider changes. preview = Cloudflare; preview + netlify = Netlify.');
if (!process.argv.includes('--dry-run')) git('push', '-u', 'origin', `HEAD:${branch}`);
