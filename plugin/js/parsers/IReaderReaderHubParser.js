"use strict";

parserFactory.register("reader-hub.com", () => new IReaderReaderHubParser());

class IReaderReaderHubParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let chapters = IReaderReaderHubParser.extractChaptersFromDom(dom);
        if (chapters.length > 0) {
            return chapters;
        }
        try {
            let iframeDom = await HttpClient.fetchIframeDom(dom.baseURI, {
                waitForSelector: ".chapters a",
                minMatchCount: 1,
                timeoutMs: 45000
            });
            return IReaderReaderHubParser.extractChaptersFromDom(iframeDom);
        } catch {
            return chapters;
        }
    }

    static extractChaptersFromDom(dom) {
        const selector = ".chapters a";
        if (!selector) {
            return util.hyperlinksToChapterList(dom.body || dom.documentElement);
        }
        let nodes = [...dom.querySelectorAll(selector)];
        let links = nodes.map(node => (node.tagName === "A") ? node : node.querySelector("a"))
            .filter(a => a && a.href);
        return links.map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        const selector = ".font-poppins p";
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

    async fetchChapter(url) {
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        let content = this.findContent(chapterDom);
        if (content != null && (content.textContent?.length || 0) >= 10) {
            return chapterDom;
        }
        try {
            let iframeDom = await HttpClient.fetchIframeDom(url, {
                waitForSelector: ".font-poppins p",
                minTextLength: 10,
                timeoutMs: 45000
            });
            if (this.findContent(iframeDom) != null) {
                return iframeDom;
            }
        } catch {
            // ignore and fall back
        }
        return chapterDom;
    }

    findChapterTitle(dom, webPage) {
        let title = (() => {
            const selector = "#item-0 > div:nth-child(2)";
            return selector ? dom.querySelector(selector) : null;
        })();
        return title ?? (webPage ? webPage.title : null);
    }

    extractTitleImpl(dom) {
        const selector = "h1.q-mt-xs";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        const selector = "div:nth-child(1) > div.text-subtitle1.text-bold.text-grey-8";
        let author = selector ? dom.querySelector(selector)?.textContent?.trim() : null;
        return util.isNullOrEmpty(author) ? super.extractAuthor(dom) : author;
    }

    findCoverImageUrl(dom) {
        const selector = ".text-center img";
        let img = selector ? dom.querySelector(selector) : null;
        return img?.getAttribute("src") || super.findCoverImageUrl(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        const selector = ".text-synopsis p";
        return selector ? [...dom.querySelectorAll(selector)] : [];
    }
}
