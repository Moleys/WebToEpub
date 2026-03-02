"use strict";

parserFactory.register("free.kolnovel.com", () => new IReaderKolNovelFreeParser());

class IReaderKolNovelFreeParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        const selector = "li[data-id]";
        if (!selector) {
            return util.hyperlinksToChapterList(dom.body || dom.documentElement);
        }
        let items = [...dom.querySelectorAll(selector)];
        let chapters = items.map(item => {
            let link = item.querySelector("a[href]");
            if (!link) {
                return null;
            }
            let chapter = util.hyperLinkToChapter(link);
            let num = item.querySelector(".epl-num")?.textContent?.trim() ?? "";
            let title = item.querySelector(".epl-title")?.textContent?.trim() ?? "";
            let fullTitle = (num + " " + title).trim();
            if (!util.isNullOrEmpty(fullTitle)) {
                chapter.title = fullTitle;
            }
            return chapter;
        }).filter(c => c != null);
        if (chapters.length === 0) {
            return util.hyperlinksToChapterList(dom.body || dom.documentElement);
        }
        return chapters.reverse();
    }

    findContent(dom) {
        const selector = "div.entry-content p:not([style*=opacity]), div.entry-content ol li";
        if (selector) {
            let nodes = [...dom.querySelectorAll(selector)];
            if (nodes.length > 0) {
                let wrapper = dom.createElement("div");
                for (let node of nodes) {
                    wrapper.appendChild(node.cloneNode(true));
                }
                return wrapper;
            }
        }
        return dom.body || dom.documentElement;
    }

    removeUnwantedElementsFromContentElement(element) {
        for (let node of [...element.querySelectorAll("p, li")]) {
            let text = node.textContent?.toLowerCase() ?? "";
            if (text.includes("kollnovel") || text.includes("kolnovel")) {
                node.remove();
            }
        }
        super.removeUnwantedElementsFromContentElement(element);
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

    extractAuthor(dom) {
        const labelText = "\u0627\u0644\u0643\u0627\u062a\u0628";
        let label = [...dom.querySelectorAll("div.serl")]
            .find(el => el.textContent?.includes(labelText));
        let author = label?.querySelector("span a, span")?.textContent?.trim();
        return util.isNullOrEmpty(author) ? super.extractAuthor(dom) : author;
    }

    findCoverImageUrl(dom) {
        const selector = "div.sertothumb img";
        let img = selector ? dom.querySelector(selector) : null;
        return img?.getAttribute("src") || super.findCoverImageUrl(dom);
    }
}
