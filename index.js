#!/usr/bin/env node
import async from 'async';
import chalk from 'chalk';
import fs from 'node:fs';
import {Octokit} from '@octokit/rest';

/**
 * GitHub Issues to PDF.
 * Extracts and converts GitHub issues into PDF files.
 */
class GIP {

    /**
     * @type {Octokit|null}
     */
    static #_gitHub = null;

    static #_pathOutput = null;

    /**
     * Helper to dynamically import inquirer, avoiding global side effects on load.
     * @returns {Promise<import('inquirer').Inquirer>}
     */
    static async #getInquirer() {
        return (await import('inquirer')).default;
    }

    /**
     *
     * @return {Octokit|null}
     */
    static get gitHub() {
        return GIP.#_gitHub;
    }

    static get pathOutput() {
        return GIP.#_gitHub;
    }

    /**
     * Sets a new {Octokit} instance.
     * @param token {string}
     */
    static setGitHub(token) {
        GIP.#_gitHub = new Octokit({auth: token, userAgent: GIP.conf.agent});
    }

    /**
     * Configuration.
     * @type {GipConf}
     */
    static conf = {
        dirOutput: './data/output',
        fileToken: './data/conf/token.json',
        rgx: {
            fileDate: /^(\d{4})(-(\d{2}))(-(\d{2}))/gm,
            issueYear: /^(\d{4})/gm,
            token: /([a-zA-Z0-9]{40})+/g,
            year: /^(\d{4})$/,
        },
        choice: {
            modeRepos: ['one', 'multiple', 'all'],
            modeAccountType: ['organization', 'user'],
        },
        agent: 'GIP Agent',
        pdfOptions: {
            format: 'A4',
            scale: 0.7,
            margin: {
                top: '1.2cm',
                right: '1.2cm',
                bottom: '1cm',
                left: '1.2cm'
            },
        }
    };

    /**
     * Checks that the token is previously stored.
     * @return {boolean}
     */
    static get isTokenStored() {
        return fs.existsSync(GIP.conf.fileToken);
    }

    /**
     * Prompts user to enter GitHub token.
     * @return {Promise<GHToken>}
     */
    static async askForToken() {
        const question = {
            message: 'Access Token is not stored yet. Please enter token:',
            name: 'id', type: 'input',
            validate: (value) => {
                return (value.match(GIP.conf.rgx.token)) ? true : 'Invalid input for GitHub access token.';
            }
        }
        const inquirer = await GIP.#getInquirer();
        return inquirer.prompt([question])
            .then((answer) => {
                fs.writeFileSync(GIP.conf.fileToken, JSON.stringify(answer));
                return answer;
            });
    }

    /**
     * Reads token from a file.
     * @return {GHToken}
     */
    static readTokenFromFile() {
        return JSON.parse(fs.readFileSync(GIP.conf.fileToken, 'utf-8'));
    }

    /**
     *
     * @param cnf {GHConf}
     */
    static makeMainOutputDirIfNeeded(cnf) {
        if (!GIP.pathOutput) {
            GIP.#_pathOutput = `${GIP.conf.dirOutput}/${cnf.accountInfo.accountName}`;
        }
        if (!fs.existsSync(GIP.#_pathOutput)) {
            fs.mkdirSync(GIP.#_pathOutput, {recursive: true});
        }
    }

    static makeIssueOutputDirIfNeeded(issue) {
        const pathDir = `${GIP.#_pathOutput}/${issue.repo}`;
        if (!fs.existsSync(pathDir)) {
            fs.mkdirSync(pathDir, {recursive: true});
        }
        return pathDir;
    }

    /**
     * @param issue {GHIssueInfo}
     * @return {string}
     */
    static makePdfFilePath(issue) {
        const pathDir = GIP.makeIssueOutputDirIfNeeded(issue);
        GIP.conf.rgx.fileDate.lastIndex = 0;
        const issueDate = GIP.conf.rgx.fileDate.exec(issue.created)[0];
        const issueId = String(issue.num).padStart(4, '0');
        return `${pathDir}/${issueDate}.#${issueId}.pdf`;
    }

    static async askAccount() {
        const inquirer = await GIP.#getInquirer();
        return inquirer.prompt(
            [
                {
                    choices: GIP.conf.choice.modeAccountType,
                    message: 'Please select your account type?',
                    name: 'accountType',
                    type: 'list'
                },
                {
                    filter: (answer) => {
                        return answer.toLowerCase();
                    },
                    message: 'Please enter the name of the account you would like to query (required):',
                    name: 'accountName',
                    type: 'input',
                    validate: (answer) => {
                        return (answer === '') ? 'You must input an account name.' : true;
                    }
                },
                {
                    choices: GIP.conf.choice.modeRepos,
                    message: 'How many repositories would you like to search?',
                    name: 'howManyRepos',
                    type: 'list'
                },
                {
                    filter: (answer) => {
                        return answer.toLowerCase();
                    },
                    message: 'Please enter the name of the specific repository you want:',
                    name: 'repoName',
                    type: 'input',
                    validate: (answer) => {
                        return (answer === '') ? 'You must input a repository name.' : true;
                    },
                    when: (answers) => {
                        return answers.howManyRepos === 'one';
                    }
                }
            ]
        );
    }

    /**
     *
     * @param sep {string|null}
     * @param repoListForPrompt
     * @param repoArray {GHRepo[]}
     * @return {Promise<GHRepo[]>}
     */
    static async askForRepos(sep, repoListForPrompt, repoArray) {
        if (!sep) sep = '';
        const inquirer = await GIP.#getInquirer();
        return inquirer
            .prompt([
                {
                    message: 'Input a repository to search:',
                    name: 'repoName',
                    type: 'input'
                },
                {
                    message: (answers) => {
                        return `Current repository list: ${chalk.yellow(repoListForPrompt, sep, answers.repoName)} \n Would you like to add another repository?`;
                    },
                    name: 'more',
                    type: 'confirm'
                }]
            )
            .then((answers) => {
                    repoListForPrompt.push(` ${answers.repoName}`);
                    repoArray.push({name: answers.repoName});
                    if (answers.more === true) {
                        return GIP.askForRepos(',', repoListForPrompt, repoArray);
                    }
                    return repoArray;
                }
            );
    }

    /**
     *
     * @return {Promise<GHIssueYear>}
     */
    static async askForYear() {
        const inquirer = await GIP.#getInquirer();
        return inquirer.prompt(
            [
                {
                    message: 'Are you searching for issues that were open during a specific year?',
                    name: 'searchByDate',
                    type: 'confirm'
                },
                {
                    message: 'What year were the issues open during?',
                    name: 'issueYear',
                    type: 'input',
                    validate: value => {
                        const pass = GIP.conf.rgx.year.exec(String(value));
                        if (pass) return true;
                        return 'Please enter a valid year (YYYY).';
                    },
                    when: answers => {
                        return answers.searchByDate === true;
                    }
                }
            ]
        );
    }

    static makeGHHref(issue) {
        return `https://github.com/${issue.owner}/${issue.repo}/issues/${issue.num}`;
    }

    /**
     * Generates a PDF version of a given issue.
     * @param issue {GHIssueInfo}
     * @return {Promise<void>}
     */
    static async generatePDF(issue) {
        if (issue) {
            const puppeteer = (await import('puppeteer')).default;
            const browser = await puppeteer.launch();
            const page = await browser.newPage()
            const ghHref = GIP.makeGHHref(issue);
            // noinspection SpellCheckingInspection
            await page.goto(ghHref, {waitUntil: 'networkidle2'});
            const filePath = GIP.makePdfFilePath(issue);
            const options = /** @type {PDFOptions} */ ({...GIP.conf.pdfOptions, path: filePath});
            await page.pdf(options);
            await browser.close();
            process.stdout.write(`\t${chalk.yellow('PDF stored at')} ${chalk.green(filePath)}${chalk.yellow('.')}\n`);
        } else {
            process.stdout.write(`\n${chalk.yellow('No issues found in')} ${chalk.cyan('[')}${chalk.cyan(issue.repo)}${chalk.cyan(']')}.\n\n`);
        }
    }

    static filterByYear(issues, year, datedIssues) {
        if (Array.isArray(issues)) {
            for (const issue of issues) {
                const createdOnOrBeforeDate = (issue.created.match(GIP.conf.rgx.issueYear) === year);
                const notClosedOrClosedAfterDate = ((issue.created.match(GIP.conf.rgx.issueYear) <= year) && (!issue.closed || issue.closed.match(GIP.conf.rgx.issueYear) >= year));
                if (createdOnOrBeforeDate || notClosedOrClosedAfterDate) {
                    datedIssues.push({closed: issue.closed, created: issue.created, num: issue.num, owner: issue.owner, repo: issue.repo});
                }
            }
        }
        return datedIssues;
    }

    static printFetchingRepo(repoName, count) {
        if (count >= 1) {
            process.stdout.write(`\n${chalk.yellow('Fetching issues from repo')} ${chalk.cyan(repoName)}${chalk.yellow('...')}\n`);
        }
    }

    /**
     *
     * @param cnf {GHConf}
     */
    static processRepo(cnf) {
        GIP.fetchIssues(cnf, cnf.accountInfo.repoName, [], (issues) => {
                if (cnf.yearOfIssue?.issueYear) {
                    const datedIssues = GIP.filterByYear(issues, cnf.yearOfIssue.issueYear, []);
                    GIP.printFetchingRepo(cnf.accountInfo.repoName, datedIssues?.length ?? 0)
                    GIP.queueForRender(datedIssues);
                } else {
                    GIP.printFetchingRepo(cnf.accountInfo.repoName, issues?.length ?? 0)
                    GIP.queueForRender(issues);
                }
            }
        );
    }

    /**
     * Ques issue for rendering.
     * @param issues {GHIssueInfo[]}
     * @param callback {Function|null}
     */
    static queueForRender(issues, callback = null) {
        async.mapLimit(issues, 15, GIP.generatePDF, (err, _res) => {
                if (err) throw err;
                if (issues[0] !== undefined) {
                    process.stdout.write(`\n\t${chalk.yellow('All issues from repo')} ${chalk.cyan(issues[0].repo)} ${chalk.yellow('have finished rendering.')}\n\n`);
                }
                if (typeof callback === 'function') callback();
            }
        );
    }

    static fetchIssues(config, repo, collectedIssues, callback) {
        GIP.gitHub?.rest.issues.listForRepo({owner: config.accountInfo.accountName, page: config.page, per_page: 100, repo, state: 'all'})
            .then(res => {
                for (const issue of res.data) {
                    collectedIssues.push({
                        closed: issue.closed_at,
                        created: issue.created_at,
                        num: issue.number,
                        owner: config.accountInfo.accountName,
                        repo: repo,
                    });
                }
                if (res?.headers?.link?.includes('rel="next"')) {
                    config.page++;
                    GIP.fetchIssues(config, repo, collectedIssues, callback);
                } else {
                    callback(collectedIssues);
                }
            })
            .catch((err) => {
                console.error(err);
                process.stdout.write(`${chalk.bgRed('ERROR:')} Either the account ${chalk.yellow('[')} ${chalk.yellow(config.accountInfo.accountName)} ${chalk.yellow(']')} or the repository ${chalk.yellow('[')} ${chalk.yellow(repo)} ${chalk.yellow(']')} couldn't be found, double-check the names and try again.\n`);
            });
    }

    static fetchUserRepos(config, collectedRepos, callback) {
        GIP.gitHub?.rest.repos.listForUser({page: config.page, per_page: 100, type: 'owner', username: config.accountInfo.accountName})
            .then(res => {
                for (const repo of res.data) {
                    collectedRepos.push({name: repo.name, owner: config.accountInfo.accountName});
                }
                if (res?.headers?.link?.includes('rel="next"')) {
                    config.page++;
                    GIP.fetchUserRepos(config, collectedRepos, callback);
                } else {
                    config.page++;
                    callback(collectedRepos);
                }
            })
            .catch(() => {
                process.stdout.write(`${chalk.bgRed('ERROR:')} The account ${chalk.yellow('[')}${chalk.yellow(config.accountInfo.accountName)}${chalk.yellow(']')} couldn't be found, double-check the name and try again.\n`);
            });
    }

    static fetchOrgRepos(config, collectedRepos, callback) {
        GIP.gitHub?.rest.repos.listForOrg({org: config.accountInfo.accountName, page: config.page, per_page: 100, type: 'public'})
            .then(res => {
                for (const repo of res.data) {
                    collectedRepos.push({name: repo.name, owner: config.accountInfo.accountName});
                }
                if (res?.headers?.link?.includes('rel="next"')) {
                    config.page++;
                    GIP.fetchOrgRepos(config, collectedRepos, callback);
                } else {
                    callback(collectedRepos);
                }
            })
            .catch((_) => {
                process.stdout.write(`${chalk.bgRed('ERROR:')} The account ${chalk.yellow('[')}${chalk.yellow(config.accountInfo.accountName)}${chalk.yellow(']')} couldn't be found, double-check the name and try again.\n`);
            });
    }

    /**
     *
     * @param config {GHConf}
     */
    static fetchOrgIssues(config) {
        const collectedIssues = [];
        GIP.fetchOrgRepos(config, [],
            (repos) => {
                async.eachSeries(repos, (repo, callback) => {
                        config.page = 1;
                        GIP.fetchIssues(config, repo.name, [], (issues) => {
                                if (config.yearOfIssue.issueYear) {
                                    const datedIssues = GIP.filterByYear(issues, config.yearOfIssue.issueYear, []);
                                    GIP.queueForRender(datedIssues, callback);
                                } else {
                                    GIP.queueForRender(collectedIssues, callback);
                                }
                            },
                            (_err, _res) => {
                                process.stdout.write(`\n${chalk.yellow('All issues have finished rendering, have a nice day!')}\n\n`);
                            }
                        );
                    }
                );
            }
        );
    }

    /**
     *
     * @param cnf {GHConf}
     */
    static fetchUserIssues(cnf) {
        const collectedRepos = [];
        GIP.fetchUserRepos(cnf, collectedRepos, (repos) => {
                async.eachSeries(repos, (repo, callback) => {
                        const collectedIssues = [];
                        cnf.page = 1;
                        GIP.fetchIssues(cnf, repo.name, collectedIssues, (issues) => {
                                if (cnf.yearOfIssue.issueYear) {
                                    const datedIssues = GIP.filterByYear(issues, cnf.yearOfIssue.issueYear, []);
                                    GIP.printFetchingRepo(repo.name, datedIssues?.length ?? 0)
                                    GIP.queueForRender(datedIssues, callback);
                                } else {
                                    GIP.printFetchingRepo(repo.name, collectedIssues?.length ?? 0)
                                    GIP.queueForRender(collectedIssues, callback);
                                }
                            },
                            (_err, _res) => {
                                return process.stdout.write(`\n${chalk.yellow('All issues have finished rendering, have a nice day!')}\n\n`);
                            }
                        );
                    }
                );
            }
        );
    }

    /**
     *
     * @param cnf {GHConf}
     */
    static fetchIssuesFromMultipleRepos(cnf) {
        async.eachSeries(cnf.multipleRepos, (repo, callback) => {
                cnf.page = 1;
                GIP.fetchIssues(cnf, repo.name, [],
                    (issues) => {
                        if (cnf.yearOfIssue.issueYear) {
                            const datedIssues = GIP.filterByYear(issues, cnf.yearOfIssue.issueYear, []);
                            GIP.printFetchingRepo(repo.name, datedIssues?.length ?? 0)
                            GIP.queueForRender(datedIssues, callback);
                        } else {
                            GIP.printFetchingRepo(repo.name, issues?.length ?? 0);
                            GIP.queueForRender(issues, callback);
                        }
                    },
                    (_err, _res) => {
                        process.stdout.write(`\n${chalk.yellow('All issues have finished rendering, have a nice day!')}\n\n`);
                    }
                );
            }
        );
    }

    /**
     * Processes given user request.
     * @param cnf {GHConf}
     */
    static processUserRequest(cnf) {
        process.stdout.write(`\n${chalk.yellow('Processing repos from')} ${chalk.cyan(cnf.accountInfo.accountName)}${chalk.yellow('...')}\n\n`);
        GIP.makeMainOutputDirIfNeeded(cnf);
        GIP.setGitHub(cnf.token.id);
        if ((cnf.accountInfo.accountType === 'organization') && (cnf.accountInfo.howManyRepos === 'all')) {
            return GIP.fetchOrgIssues(cnf);
        }
        if ((cnf.accountInfo.accountType === 'user') && (cnf.accountInfo.howManyRepos === 'all')) {
            return GIP.fetchUserIssues(cnf);
        }
        if (cnf.accountInfo.howManyRepos === 'multiple') return GIP.fetchIssuesFromMultipleRepos(cnf);
        GIP.processRepo(cnf);
    }

    /**
     * Prompts the user for inputs and fetches issues.n
     * @return {Promise<void>}
     */
    static async askAndRun() {
        const cnf = {page: 1, token: GIP.isTokenStored ? GIP.readTokenFromFile() : await GIP.askForToken(),}
        cnf.accountInfo = await GIP.askAccount();
        cnf.multipleRepos = undefined;
        if (cnf.accountInfo.howManyRepos === 'multiple') {
            cnf.multipleRepos = await GIP.askForRepos(null, [], []);
        }
        cnf.yearOfIssue = await GIP.askForYear();
        GIP.processUserRequest(cnf);
    }

    /**
     * Starts application
     */
    static run() {
        process.on('exit', (code) => {
            process.stdout.write(`\n${chalk.green('Done.')}\n`);
        });
        (async () => {
            GIP.askAndRun().catch(err => {
                console.error(chalk.red('An error occurred:'), err);
            });
        })();
    }

}


/**
 * Run application
 */
if (process.env.GIP_SEA_BUILD === 'true') {
    try {
        const v8 = require('v8');
        v8.startupSnapshot.setDeserializeMainFunction(() => {
            GIP.run();
        });
    } catch (e) {
        console.error("Could not set up snapshot deserialization:", e);
        process.exit(1);
    }
} else {
    GIP.run();
}