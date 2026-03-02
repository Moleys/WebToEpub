"use strict";

parserFactory.register("dreambigtl.com", () => new IReaderDreamBigTlParser());

class IReaderDreamBigTlParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        const selector = ".chapter-panel ul li a";
        if (!selector) {
            return util.hyperlinksToChapterList(dom.body || dom.documentElement);
        }
        let nodes = [...dom.querySelectorAll(selector)];
        let links = nodes.map(node => (node.tagName === "A") ? node : node.querySelector("a"))
            .filter(a => a && a.href);
        let chapters = links.map(a => util.hyperLinkToChapter(a));
        return chapters.reverse();
    }

    findContent(dom) {
        const selector = ".post-body, .entry-content";
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
            const selector = "h1.entry-title";
            return selector ? dom.querySelector(selector) : null;
        })();
        return title ?? (webPage ? webPage.title : null);
    }

    extractTitleImpl(dom) {
        const selector = "h1.entry-title";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    findCoverImageUrl(dom) {
        const selector = ".post-body, .entry-content";
        return selector ? util.getFirstImgSrc(dom, selector) : super.findCoverImageUrl(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        const selector = ".post-body p:first-child, .entry-content p:first-child";
        return selector ? [...dom.querySelectorAll(selector)] : [];
    }
}
