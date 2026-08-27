# Setting up your Mac for this project

A step-by-step guide to going from a fresh Mac to running this project and
pushing it to GitHub. Skip any step you've already done.

Open **Terminal** (Cmd+Space, type "Terminal") for all of the commands below.

## 1. Xcode Command Line Tools

Needed for git and other dev basics.

```bash
xcode-select --install
```

A popup will appear — click Install and wait for it to finish.

## 2. Homebrew (package manager)

Homebrew installs and manages dev tools on macOS.

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

After it finishes, it will print 1-2 commands to add Homebrew to your PATH —
run those (they usually look like the two lines below; the exact path
depends on whether you have an Apple Silicon or Intel Mac):

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

Verify it worked:

```bash
brew --version
```

## 3. Git

```bash
brew install git
git --version
```

Set your identity (used on every commit):

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

## 4. Python

macOS ships an old system Python — install a current one via Homebrew:

```bash
brew install python@3.12
python3 --version   # should show 3.12.x
```

## 5. Node.js (for the React frontend)

```bash
brew install node
node --version    # v18+ 
npm --version
```

## 6. GitHub CLI (makes creating/pushing repos painless)

```bash
brew install gh
gh --version
gh auth login
```

`gh auth login` walks you through authenticating — pick **GitHub.com**,
**HTTPS**, and **Login with a web browser**, then follow the prompts.

## 7. A code editor

If you don't already have one:

```bash
brew install --cask visual-studio-code
```

Recommended VS Code extensions once it's installed: **Python** (Microsoft),
**ESLint**, **Prettier**, and **SQLite Viewer** (handy for peeking at the
local `.db` file this project creates).

## 8. (Optional) Postgres, for when you outgrow SQLite

Not needed to get started — the project uses SQLite by default, which needs
zero setup. When you're ready for Postgres:

```bash
brew install postgresql@16
brew services start postgresql@16
createdb dealer_crm
```

Then in `backend/.env`, set:
```
DATABASE_URL=postgresql+psycopg2://localhost/dealer_crm
```

## 9. Get the project running

If you received this project as a zip from Claude:

```bash
cd ~/Downloads
unzip dealer-crm.zip -d ~/Projects/dealer-crm
cd ~/Projects/dealer-crm
```

(Adjust `~/Projects` to wherever you keep code — create the folder first
with `mkdir -p ~/Projects` if it doesn't exist.)

Then follow the **Running it locally** section in `README.md`.

## 10. Push it to GitHub

The zip already contains a git repo with an initial commit, so you just need
to create an empty repo on GitHub and point this one at it.

**Easiest way (using the GitHub CLI you just installed):**

```bash
cd ~/Projects/dealer-crm
gh repo create dealer-crm --private --source=. --remote=origin --push
```

This creates a private repo under your GitHub account, wires it up as
`origin`, and pushes your initial commit — all in one command. Drop
`--private` if you'd rather it be public (good if you want to link it on a
resume).

**Or manually, if you'd rather not use `gh`:**

1. Go to https://github.com/new, name it `dealer-crm`, leave it empty (no
   README/gitignore — you already have those), click **Create repository**.
2. Copy the commands GitHub shows you under "…or push an existing
   repository from the command line", which will look like:

```bash
git remote add origin https://github.com/YOUR_USERNAME/dealer-crm.git
git branch -M main
git push -u origin main
```

After that, `git push` alone will work for future commits.

## Everyday workflow from here

```bash
git add -A
git commit -m "describe what you changed"
git push
```

Do this in small, frequent commits as you build features — it's both good
practice and gives you a commit history that's useful to show off later.
