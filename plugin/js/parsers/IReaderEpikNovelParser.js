"use strict";

parserFactory.register("epiknovel.com", () => new IReaderEpikNovelParser());

class IReaderEpikNovelParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        const selector = "table tr td:nth-child(1) > a";
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
        const selector = "#icerik p";
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
        return dom.querySelector("#icerik") || dom.body || dom.documentElement;
    }

    findChapterTitle(dom, webPage) {
        let title = (() => {
            const selector = "#icerik > center > h4 > b";
            return selector ? dom.querySelector(selector) : null;
        })();
        return title ?? (webPage ? webPage.title : null);
    }

    extractTitleImpl(dom) {
        const selector = "h1#tables";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    findCoverImageUrl(dom) {
        const selector = "img.manga-cover";
        let img = selector ? dom.querySelector(selector) : null;
        return img?.getAttribute("src") || super.findCoverImageUrl(dom);
    }
}
