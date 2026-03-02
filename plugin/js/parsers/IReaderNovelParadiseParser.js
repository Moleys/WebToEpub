"use strict";

parserFactory.register("novelsparadise.site", () => new IReaderNovelParadiseParser());

class IReaderNovelParadiseParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        const selector = ".eplisterfull li a";
        if (!selector) {
            return util.hyperlinksToChapterList(dom.body || dom.documentElement);
        }
        let nodes = [...dom.querySelectorAll(selector)];
        let links = nodes.map(node => (node.tagName === "A") ? node : node.querySelector("a"))
            .filter(a => a && a.href);
        return links.map(a => {
            let chapter = util.hyperLinkToChapter(a);
            let num = a.querySelector(".epl-num")?.textContent?.trim();
            if (!util.isNullOrEmpty(num)) {
                chapter.title = num;
            }
            return chapter;
        });
    }

    findContent(dom) {
        const selector = ".entry-content p";
        if (selector) {
            let nodes = [...dom.querySelectorAll(selector)];
            if (nodes.length > 0) {
                if (nodes.length === 1) {
                    return nodes[0];
                }
                let wrapper = dom.createElement("div");
                for (let node of nodes) {
                    wrapper.appendChild(node.cloneNode(true));
                }
                return wrapper;
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
        const selector = "h1.entry-title";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        const selector = ".serl:nth-child(3) .serval";
        let author = selector ? dom.querySelector(selector)?.textContent?.trim() : null;
        return util.isNullOrEmpty(author) ? super.extractAuthor(dom) : author;
    }

    findCoverImageUrl(dom) {
        const selector = ".sertothumb img";
        let img = selector ? dom.querySelector(selector) : null;
        return img?.getAttribute("src") || super.findCoverImageUrl(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        const selector = ".sersysn p";
        return selector ? [...dom.querySelectorAll(selector)] : [];
    }
}
