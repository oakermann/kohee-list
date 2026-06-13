# Troubleshooting: SETUP_WORKTREE_FAILED

## Diagnosis

The `SETUP_WORKTREE_FAILED` error occurs during OAP managed project setup when the local git state gets out of sync.

### Root Cause
1. A capsule task is processed, creating a task-specific branch (e.g., `task/kohee-list/cap-managed-<id>`) in the local repository.
2. If the setup or task fails or is aborted, the corresponding worktree directory under `.worktrees/` may be removed or deleted on disk.
3. When the task is retried or a new task is run, git generates a command:
   ```bash
   git worktree add "<path>" -b <branch> origin/main
   ```
4. This command attempts to create a new branch using the `-b` option. Because the branch already exists locally (leftover from the previous run) but the worktree directory does not exist, git fails with:
   ```text
   fatal: a branch named '<branch>' already exists
   ```
5. Since the directory is missing, the OAP reuse logic (`cleanExistingWorktree`) cannot reset or clean the worktree, returning a failure which cascades to `SETUP_WORKTREE_FAILED` and dead-letters the inbox item.

## Resolution Runbook

To resolve this issue, clean up the stale local git branch that does not have an active worktree.

### Step-by-Step Cleanup

1. **List existing worktrees:**
   Confirm which worktrees are active and registered by running:
   ```bash
   git worktree list
   ```

2. **List local branches:**
   Identify local branches (active worktrees are prefixed with `+` in git branch output):
   ```bash
   git branch
   ```

3. **Delete stale branches:**
   For any branch named `task/kohee-list/cap-managed-<id>` that does **not** have an active worktree, delete it:
   ```bash
   git branch -D task/kohee-list/cap-managed-<id>
   ```

4. **Retry setup:**
   Rerun the automation pickup or the setup-worktree CLI. It will now successfully create the worktree and checkout the branch.
