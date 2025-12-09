# GIP - GitHub Issues to PDF

This project is a modernized fork of [github-issues-to-pdf](https://github.com/alexandervalencia/github-issues-to-pdf) by [alexandervalencia](https://github.com/alexandervalencia). The original repository has not been updated in over 7 years, so significant updates were required. This eventually led to a near-complete rewrite with several improvements and changes.

Many thanks to [Alexander Valencia](https://github.com/alexandervalencia) for the original work and inspiration!

## Binary version (macOS)

A standalone executable version (no Node.js installation required) can be downloaded from the releases section.

To enable running the app, you need to remove the quarantine attribute::

```shell
xattr -d com.apple.quarantine gip
```

The command deletes the quarantine attribute from executable, effectively telling macOS that the file is safe to run without the security prompt.

## Node version

### Requirements

This is a `Node.js`-based project, so you need a working `Node.js` environment to run it. 

To install Node.js, visit the official download page: https://nodejs.org/en/download

### Usage

#### 1. Install dependencies

In the project root directory, run:

```shell
npm install
```

#### 2. Start the application

```shell
npm start	
```

On first launch you will be prompted for:

- A GitHub Personal Access Token.
- Repository owner.
- Misc details.

#### GitHub Personal Access Token

Create one here: [Personal Access Token](https://github.com/settings/tokens/new)  The token is saved locally after the first run. Delete the saved file if you want to use a different token.

### Output

PDF files are saved in the `./data` folder with this structure:

```
data/
	└── output/
			└── <owner>/
					└── <repo>/
```

Files are named using creation date and issue number for easy sorting.

## Bugs / Problems

Please do not hesitate to share any bugs or issues you encounter in this repository’s issues section. Just a heads-up, though, it might take a bit of time to get back to you.