/**
 * @typedef {import('jsdom').JSDOM} JSDOM
 */

/**
 * @typedef {import('marked').marked} marked
 */

/**
 * Generates GitHub-styled HTML from issue data.
 */
export class HTMLGenerator {

    static #_cachedStyles = null;
    /** @type {marked} */
    static #_marked = null;
    /** @type {JSDOM|null} */
    static #_JSDOM = null;

    static async #_ensureLibs() {
        if (!HTMLGenerator.#_marked) {
            const markedModule = await import('marked');
            HTMLGenerator.#_marked = markedModule.marked;
        }
        if (!HTMLGenerator.#_JSDOM) {
            const jsdomModule = await import('jsdom');
            HTMLGenerator.#_JSDOM = jsdomModule.JSDOM;
        }
    }

    /**
     * Generates a complete HTML document for an issue
     * @param issueData - Issue data from GitHub API
     * @param commentsData - Array of comments from GitHub API
     * @return {Promise<string>} Complete HTML document
     */
    static async generate(issueData, commentsData) {
        await HTMLGenerator.#_ensureLibs();
        const bodyHTML = HTMLGenerator.#renderMarkdown(issueData.body);
        const labelsHTML = HTMLGenerator.#renderLabels(issueData.labels);
        const commentsHTML = HTMLGenerator.#renderComments(commentsData);
        const metaHTML = HTMLGenerator.#renderMeta(issueData);
        const data = HTMLGenerator.#_makeDocument({
            title: `#${issueData.number} ${issueData.title}`,
            meta: metaHTML,
            labels: labelsHTML,
            body: bodyHTML,
            comments: commentsHTML,
            commentCount: commentsData.length
        });
        return Promise.resolve(data);
    }

    /**
     * Renders Markdown to HTML
     * @param markdown {string|null}
     * @return {string}
     */
    static #renderMarkdown(markdown) {
        if (!markdown) {
            return '<p><em>No description provided.</em></p>';
        }
        return this.#_marked.parse(markdown);
    }

    /**
     * Renders issue metadata
     * @param issueData - Issue data
     * @return {string}
     */
    static #renderMeta(issueData) {
        const author = issueData.user.login;
        const openedDate = new Date(issueData.created_at).toLocaleString();
        const stateInfo = issueData.state === 'closed'
            ? `<span style="color: #8250df;">Closed</span> on ${new Date(issueData.closed_at).toLocaleString()}`
            : '<span style="color: #1a7f37;">Open</span>';
        return `<strong>${author}</strong> opened this issue on ${openedDate} • ${stateInfo}`;
    }

    /**
     * Renders labels
     * @param labels {Array} - Array of label objects
     * @return {string}
     */
    static #renderLabels(labels) {
        if (!labels || labels.length === 0) {
            return '';
        }

        const labelItems = labels.map(label => {
            const bgColor = `#${label.color}`;
            const textColor = this.#getContrastColor(label.color);
            return `<span class="label" style="background-color: ${bgColor}; color: ${textColor};">${label.name}</span>`;
        }).join('');

        return `<div class="labels">${labelItems}</div>`;
    }

    /**
     * Renders all comments
     * @param comments {Array} - Array of comment objects
     * @return {string}
     */
    static #renderComments(comments) {
        if (!comments || comments.length === 0) {
            return '';
        }

        return comments.map(comment => this.#renderSingleComment(comment)).join('');
    }

    /**
     * Renders a single comment
     * @param comment - Comment object
     * @return {string}
     */
    static #renderSingleComment(comment) {
        const author = comment.user.login;
        const date = new Date(comment.created_at).toLocaleString();
        const body = this.#renderMarkdown(comment.body);
        return `
            <div class="comment">
                <div class="comment-header">
                    <strong>${author}</strong> commented on ${date}
                </div>
                <div class="comment-body">${body}</div>
            </div>
        `;
    }

    /**
     * Builds complete HTML document
     * @param data - Object containing all parts
     * @return {string}
     */
    static #_makeDocument(data) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <style>${this.#_pageStyles}</style>
            </head>
            <body>
                <h1>${data.title}</h1>
                <div class="meta">${data.meta}</div>
                ${data.labels}
                <div class="body">${data.body}</div>
                ${data.commentCount > 0 ? `<h2 class="comments-header">${data.commentCount} comment${data.commentCount > 1 ? 's' : ''}</h2>` : ''}
                ${data.comments}
            </body>
            </html>`;
    }

    static get #_pageStyles() {
        if (HTMLGenerator.#_cachedStyles) return HTMLGenerator.#_cachedStyles;
        const dom = new this.#_JSDOM('<!DOCTYPE html><html lang="en"><body></body></html>');
        const document = dom.window.document;
        const styleDiv = document.createElement('div');
        styleDiv.innerHTML = `
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
                    padding: 20px;
                    max-width: 980px;
                    margin: 0 auto;
                    color: #24292f;
                }
                h1 {
                    font-size: 20px;
                    margin-bottom: 8px;
                    font-weight: 600;
                }
                .meta {
                    color: #57606a;
                    font-size: 10px;
                    margin-bottom: 16px;
                }
                .labels {
                    margin: 16px 0;
                }
                .label {
                    display: inline-block;
                    padding: 0 7px;
                    font-size: 10px;
                    font-weight: 500;
                    line-height: 18px;
                    border-radius: 2em;
                    margin-right: 4px;
                }
                .body {
                    font-size: 10px;
                    line-height: 1.5;
                    padding: 16px 0;
                    border-bottom: 1px solid #d0d7de;
                }
                .comments-header {
                    font-size: 16px;
                    margin: 24px 0 16px 0;
                    font-weight: 600;
                }
                .comment {
                    margin: 16px 0;
                    border: 1px solid #d0d7de;
                    border-radius: 6px;
                }
                .comment-header {
                    padding: 8px 16px;
                    background-color: #f6f8fa;
                    border-bottom: 1px solid #d0d7de;
                    font-size: 10px;
                    color: #57606a;
                }
                .comment-body {
                    padding: 16px;
                    font-size: 10px;
                    line-height: 1.5;
                }
                pre {
                    background: #f6f8fa;
                    padding: 16px;
                    border-radius: 6px;
                    overflow-x: auto;
                    font-size: 10px;
                    line-height: 1.45;
                }
                code {
                    background: rgba(175, 184, 193, 0.2);
                    padding: 2px 6px;
                    border-radius: 6px;
                    font-size: 85%;
                    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
                }
                pre code {
                    background: none;
                    padding: 0;
                }
                img {
                    max-width: 100%;
                    height: auto;
                }
                blockquote {
                    margin: 0;
                    padding: 0 1em;
                    color: #57606a;
                    border-left: 0.25em solid #d0d7de;
                }
                a {
                    color: #0969da;
                    text-decoration: none;
                }
                a:hover {
                    text-decoration: underline;
                }
                table {
                    border-collapse: collapse;
                    width: 100%;
                }
                table th,
                table td {
                    padding: 6px 13px;
                    border: 1px solid #d0d7de;
                }
                table tr:nth-child(2n) {
                    background-color: #f6f8fa;
                }
            </style>`;
        HTMLGenerator.#_cachedStyles = styleDiv.getElementsByTagName('style')[0].innerHTML;
        return HTMLGenerator.#_cachedStyles;
    }

    /**
     * Calculates contrast colour for label backgrounds
     * @param hexColor {string} - Hex colour without #
     * @return {string} - Hex colour with #
     */
    static #getContrastColor(hexColor) {
        const r = Number.parseInt(hexColor.substr(0, 2), 16);
        const g = Number.parseInt(hexColor.substr(2, 2), 16);
        const b = Number.parseInt(hexColor.substr(4, 2), 16);
        const luminance = (r * 299 + g * 587 + b * 114) / 1000;
        return luminance >= 128 ? '#24292f' : '#ffffff';
    }
}