# Git Repository Setup Guide

## Current Status
✅ Git is initialized
✅ All files are committed locally
✅ Ready to push to remote repository

## Step 1: Create a Remote Repository

### Option A: GitHub (Recommended)

1. Go to [GitHub](https://github.com) and sign in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Fill in the details:
   - **Repository name**: `sa-shooting-comp` (or your preferred name)
   - **Description**: "South African Shooting Competition Management System"
   - **Visibility**: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click **"Create repository"**

### Option B: GitLab

1. Go to [GitLab](https://gitlab.com) and sign in
2. Click **"New project"** → **"Create blank project"**
3. Fill in the details and create the project

### Option C: Bitbucket

1. Go to [Bitbucket](https://bitbucket.org) and sign in
2. Click **"Create"** → **"Repository"**
3. Fill in the details and create the repository

## Step 2: Add Remote and Push

After creating your repository, you'll get a URL like:
- `https://github.com/yourusername/sa-shooting-comp.git` (HTTPS)
- `git@github.com:yourusername/sa-shooting-comp.git` (SSH)

### Using HTTPS (Easier for beginners):

```bash
# Add the remote repository (replace with your actual URL)
git remote add origin https://github.com/yourusername/sa-shooting-comp.git

# Push to the repository
git push -u origin master
```

If prompted for credentials:
- **Username**: Your GitHub username
- **Password**: Use a Personal Access Token (not your password)
  - Go to GitHub → Settings → Developer settings → Personal access tokens → Generate new token
  - Give it `repo` permissions
  - Copy and use it as the password

### Using SSH (Recommended for security):

```bash
# Add the remote repository (replace with your actual URL)
git remote add origin git@github.com:yourusername/sa-shooting-comp.git

# Push to the repository
git push -u origin master
```

**Note**: Make sure you have SSH keys set up with GitHub/GitLab.

## Step 3: Verify

After pushing, verify it worked:

```bash
# Check remote status
git remote -v

# Check branch status
git status
```

## Future Updates

After the initial push, you can update your repository with:

```bash
# Stage changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to remote
git push
```

## Branch Naming

If your remote repository uses `main` instead of `master`:

```bash
# Rename local branch
git branch -M main

# Push to main branch
git push -u origin main
```

## Troubleshooting

### If you get "remote origin already exists":
```bash
# Remove existing remote
git remote remove origin

# Add it again with correct URL
git remote add origin YOUR_REPO_URL
```

### If you get authentication errors:
- Make sure you're using the correct credentials
- For HTTPS, use a Personal Access Token instead of password
- For SSH, ensure your SSH key is added to your GitHub/GitLab account

### If you want to change the remote URL:
```bash
git remote set-url origin NEW_URL
```

