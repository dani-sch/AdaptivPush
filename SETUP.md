# AdaptivPush Senior Project

## Expo App Setup Instructions - (Contact Nicole with any questions)

To setup your computer to work on this project you're going to need a couple of things:
1. Node.js
2. Node Version Manager (NVM) (Optional)
3. Expo Go (on your mobile device)
4. GitHub (either connected with your IDE or just in the command line)

### I. Node Installation

You can either install node with a version manager (for version control) or simply the most recent version of node

#### Option A: Install nvm (node version manager - will allow you to switch between different versions of node.js in the future)

##### Mac/Linux
1. Open terminal
2. Run this command:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
```
3. Close and reopen terminal
4. Verify nvm is installed:
```bash 
nvm --version
```
5. Install node LTS (long term support)
```bash
nvm install --lts
nvm use --lts
```
6. Verify installation
```bash 
node -v
npm -v
```

##### Windows
1. https://github.com/coreybutler/nvm-windows/releases
2. In assets, choose nvm-setup.exe
3. Run installer, do not change default install paths
4. Open command prompt (not powershell)
5. Run the following commands
```bash
nvm version
nvm install lts
nvm use lts
node -v
npm -v
```

#### Option B: Install the current version of node.js
1. https://nodejs.org/en
2. Download LTS
3. Install with default settings 
4. Verify in command prompt/terminal
```bash
node -v
npm -v
```

### II. Install Expo Go App (on phone)

### III. Make sure you have git installed on your computer

### IV. Install Git
1. Download git from git-scm.com
2. Download the installer
3. Run the installer (use default settings)
4. Run `git --version` in command prompt to confirm

#### Connect to github

##### Use these commands to connect
```bash
git clone https://github.com/dani-sch/AdaptivPush
cd AdaptivPush
npm install
```

##### Standardize “new line” character across windows and mac
1. For windows
```bash
git config --global core.autocrlf false
```
2. For mac
```bash
git config --global core.autocrlf input
```

## Running the Expo app
1. Make sure computer and phone are on the same wifi.
2. Open terminal within IDE & project (any terminal such as IntelliJ is fine).
3. Run `npm install` if package.json or package-lock.json has been modified to update your dependencies.
4. To run the app, input `npx expo start` into the terminal. 
5. Scan qr with your phone and open Expo Go app.

## Git Commands

### Add, commit, push
1. Use `git add <filepath>` to add changes to your next commit; `<filepath>` being the file you've edited.
2. Use `git commit -m "<description>"` to commit (upload locally) your work; `<description>` being the changes.
3. Use `git push` to push (upload online, to the repository).
3. When you’re done working (to commit your changes to the project)

### Pull
1. To pull work (update your file), use `git pull`.

> [!NOTE]
> You can download extensions for your IDE so you don't have to type these commands!
