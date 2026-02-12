const { spawnSync } = require('child_process');

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: false });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function hasStagedChanges() {
  const result = spawnSync('git', ['diff', '--cached', '--quiet'], { stdio: 'ignore' });
  // git diff --quiet => 0 no changes, 1 has changes
  return result.status === 1;
}

const msg = process.argv.slice(2).join(' ').trim() || 'chore: update';

run('git', ['add', '.']);

if (hasStagedChanges()) {
  run('git', ['commit', '-m', msg]);
} else {
  console.log('No staged changes to commit.');
}

run('git', ['push', 'origin', 'main']);
