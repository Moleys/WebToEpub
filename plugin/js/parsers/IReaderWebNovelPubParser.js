"use strict";

parserFactory.register("webnovelpub.me", () => new IReaderWebNovelPubParser());

class IReaderWebNovelPubParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let base = dom.baseURI.replace(/\/$/, "");
        let totalText = dom.querySelector("#novel > header > div.header-body.container > div.novel-info > div.header-stats > span:nth-child(1) > strong")
            ?.textContent?.trim() ?? "";
        let total = parseInt(totalText.replace(/[^\d]/g, ""), 10);
        let lastPage = (!isNaN(total) && total > 0) ? Math.ceil(total / 100) : 1;
        let chapters = [];
        for (let page = 1; page <= lastPage; page++) {
            let pageDom = (await HttpClient.wrapFetch(`${base}/chapters/page-${page}`)).responseXML;
            let partial = IReaderWebNovelPubParser.parseChapterList(pageDom);
            chapterUrlsUI.showTocProgress(partial);
            chapters = chapters.concat(partial);
        }
        return chapters;
    }

    static parseChapterList(dom) {
        return [...dom.querySelectorAll(".chapter-list li")].map(li => {
            let link = li.querySelector("a[href]");
            if (!link) {
                return null;
            }
            let title = li.querySelector(".chapter-title")?.textContent?.trim()
                || link.textContent?.trim()
                || link.href;
            return {
                sourceUrl: link.href,
                title: title
            };
        }).filter(c => c != null);
    }

    findContent(dom) {
        const selector = "#chapter-container p";
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
        for (let node of [...element.querySelectorAll("p")]) {
            let text = node.textContent?.toLowerCase() ?? "";
            if (text.includes("lightnovelpub") || text.includes("no_vel_read_ing")) {
                node.remove();
            }
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom, webPage) {
        let title = (() => {
            const selector = "span.chapter-title";
            return selector ? dom.querySelector(selector) : null;
        })();
        return title ?? (webPage ? webPage.title : null);
    }

    extractTitleImpl(dom) {
        const selector = "h1.novel-title";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        const selector = ".author > a > span";
        let author = selector ? dom.querySelector(selector)?.textContent?.trim() : null;
        return util.isNullOrEmpty(author) ? super.extractAuthor(dom) : author;
    }

    findCoverImageUrl(dom) {
        const selector = "figure.cover img";
        let img = selector ? dom.querySelector(selector) : null;
        return img?.getAttribute("data-src") || img?.getAttribute("src") || super.findCoverImageUrl(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        const selector = ".summary > .content";
        return selector ? [...dom.querySelectorAll(selector)] : [];
    }
}
