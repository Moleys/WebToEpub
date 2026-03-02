"use strict";

parserFactory.register("154.84.5.213", () => new IReaderSexInSexParser());

class IReaderSexInSexParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let title = dom.querySelector(".mainbox.viewthread h1")?.textContent?.trim();
        if (util.isNullOrEmpty(title)) {
            title = dom.querySelector("title")?.textContent?.trim();
        }
        if (util.isNullOrEmpty(title)) {
            title = dom.baseURI;
        }
        return [{
            sourceUrl: dom.baseURI,
            title: title
        }];
    }

    findContent(dom) {
        const selector = ".t_msgfont.noSelect";
        if (selector) {
            let content = dom.querySelector(selector);
            if (content) {
                return content;
            }
        }
        return dom.body || dom.documentElement;
    }

    findChapterTitle(dom, webPage) {
        let title = (() => {
            const selector = ".mainbox.viewthread h1";
            return selector ? dom.querySelector(selector) : null;
        })();
        return title ?? (webPage ? webPage.title : null);
    }

    extractTitleImpl(dom) {
        const selector = ".mainbox.viewthread h1";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        const selector = ".mainbox.viewthread .postauthor cite a";
        let author = selector ? dom.querySelector(selector)?.textContent?.trim() : null;
        return util.isNullOrEmpty(author) ? super.extractAuthor(dom) : author;
    }
}
