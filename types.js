/**
 * @typedef {import('puppeteer').PDFOptions} PDFOptions
 */

/**
 * @typedef {Object} GipRgx
 * @property {RegExp} fileDate
 * @property {RegExp} issueYear
 * @property {RegExp} token
 * @property {RegExp} year
 */

/**
 * @typedef {Object} GipChoices
 * @type {string[]} modeRepos Options for fetching repos.
 * @type {string[]} modeAccountType Options for an account type.
 */

/**
 * @typedef {Object} GipConf
 * @property choice {GipChoices} Misc options for selection.
 * @property rgx {GipRgx} RegExp needed for application.
 * @property dirOutput {string} Relative path of output directory.
 * @property fileToken {string} Relative path of a token file.
 * @property agent {string} Name of Agent.
 * @property pdfOptions {PDFOptions} PDF options.
 */

/**
 * @typedef {Object} GHToken
 * @property {string} id GitHub Token.
 */

/**
 * @typedef {Object} GHAccount
 * @property {string} accountType
 * @property {string} accountName
 * @property {string} howManyRepos
 * @property {string|undefined} repoName
 */

/**
 * @typedef {Object} GHIssueYear
 * @property {boolean} searchByDate
 * @property {number|undefined} issueYear
 */

/**
 * @typedef {Object} GHRepo
 * @property name {string} Name of repo.
 * @property more {boolean|undefined}
 */

/**
 * @typedef {Object} GHConf
 * @property accountInfo {GHAccount}
 * @property multipleRepos {GHRepo[]|undefined}
 * @property page {number}
 * @property token {GHToken}
 * @property yearOfIssue {GHIssueYear}
 */

/**
 * @typedef {Object} GHIssueInfo
 * @property closed {string|null}
 * @property created {string}
 * @property num {number}
 * @property owner {string}
 * @property repo {string}
 * @property isPrivate {boolean}
 */
