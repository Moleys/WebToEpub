"use strict";

parserFactory.register("69shu.xyz", () => new IReaderShu69XyzParser());

class IReaderShu69XyzParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 1000;
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let tocLink = dom.querySelector("dd.all a");
        let tocDom = dom;
        if (tocLink?.href) {
            tocDom = (await HttpClient.wrapFetch(tocLink.href)).responseXML;
        }
        return await this.walkTocPages(tocDom,
            IReaderShu69XyzParser.chaptersFromDom,
            IReaderShu69XyzParser.nextTocPageUrl,
            chapterUrlsUI
        );
    }

    static chaptersFromDom(dom) {
        let menu = dom.querySelector("dl.panel-chapterlist");
        if (menu == null) {
            menu = dom.querySelector("div.panel.hidden-xs > dl.panel-chapterlist:nth-child(2)");
        }
        return util.hyperlinksToChapterList(menu);
    }

    static nextTocPageUrl(dom) {
        let links = [...dom.querySelectorAll("div.listpage a")];
        let next = links.find(a => (a.textContent || "").includes("\u4e0b\u4e00\u9875"));
        if (!next?.href || next.href === "javascript:void(0);") {
            return null;
        }
        return next.href === dom.baseURI ? null : next.href;
    }

    findContent(dom) {
        const selector = "#chaptercontent p";
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
        return dom.querySelector("#chaptercontent") || dom.body || dom.documentElement;
    }

    removeUnwantedElementsFromContentElement(element) {
        const removeText = "\u0036\u0039\u4e66\u5427";
        for (let node of [...element.querySelectorAll("p")]) {
            if (node.textContent?.includes(removeText)) {
                node.remove();
            }
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom, webPage) {
        let title = (() => {
            const selector = "h1";
            return selector ? dom.querySelector(selector) : null;
        })();
        return title ?? (webPage ? webPage.title : null);
    }

    extractTitleImpl(dom) {
        const selector = "h1";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        const selector = "div.caption-bookinfo > p a";
        let author = selector ? dom.querySelector(selector)?.textContent?.trim() : null;
        return util.isNullOrEmpty(author) ? super.extractAuthor(dom) : author;
    }

    findCoverImageUrl(dom) {
        const selector = "div.cover img";
        let img = selector ? dom.querySelector(selector) : null;
        return img?.getAttribute("data-src") || img?.getAttribute("src") || super.findCoverImageUrl(dom);
    }

    extractLanguage() {
        return "zh";
    }
}
