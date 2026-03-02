"use strict";

parserFactory.register("m.aixdzs.com", () => new IReaderAixdzsMobileParser());

class IReaderAixdzsMobileParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        const selector = "ul.chapter li a";
        if (!selector) {
            return util.hyperlinksToChapterList(dom.body || dom.documentElement);
        }
        let nodes = [...dom.querySelectorAll(selector)];
        let links = nodes.map(node => (node.tagName === "A") ? node : node.querySelector("a"))
            .filter(a => a && a.href);
        return links.map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        const selector = "article.page-content";
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
            const selector = null;
            return selector ? dom.querySelector(selector) : null;
        })();
        return title ?? (webPage ? webPage.title : null);
    }

    extractTitleImpl(dom) {
        const selector = ".ix-header.ix-border.ix-page h1";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        const selector = "p.ix-nowrap:nth-child(1)";
        let text = selector ? dom.querySelector(selector)?.textContent?.trim() : null;
        if (!util.isNullOrEmpty(text)) {
            return text.replace(/^\s*\u4f5c\u8005[：:]\s*/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        const selector = ".ix-list-img-square img";
        let img = selector ? dom.querySelector(selector) : null;
        return img?.getAttribute("src") || super.findCoverImageUrl(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        const selector = "#intro font";
        return selector ? [...dom.querySelectorAll(selector)] : [];
    }
}
