"use strict";

parserFactory.register("m.pawread.com", () => new IReaderPawreadMobileParser());

class IReaderPawreadMobileParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        const selector = ".filtr-item .item-box";
        if (!selector) {
            return util.hyperlinksToChapterList(dom.body || dom.documentElement);
        }
        let items = [...dom.querySelectorAll(selector)];
        let chapters = items.map(item => {
            let span = item.querySelector("span[onclick]") || item.querySelector("span:nth-child(2)");
            let onclick = span?.getAttribute("onclick") ?? "";
            let href = IReaderPawreadMobileParser.extractUrlFromOnclick(onclick);
            if (util.isNullOrEmpty(href)) {
                return null;
            }
            let url = new URL(href, dom.baseURI).href;
            let title = span?.textContent?.trim() || item.textContent?.trim();
            if (util.isNullOrEmpty(title)) {
                title = url;
            }
            return {
                sourceUrl: url,
                title: title
            };
        }).filter(c => c != null);
        return chapters;
    }

    static extractUrlFromOnclick(onclick) {
        if (util.isNullOrEmpty(onclick)) {
            return null;
        }
        let match = onclick.match(/['"]([^'"]+)['"]/);
        return match?.[1] ?? null;
    }

    findContent(dom) {
        const selector = ".content p";
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
        const selector = "#comicName";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    findCoverImageUrl(dom) {
        const selector = "#Cover img";
        let img = selector ? dom.querySelector(selector) : null;
        return img?.getAttribute("src") || super.findCoverImageUrl(dom);
    }
}
