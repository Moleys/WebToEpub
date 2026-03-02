"use strict";

parserFactory.register("webnovel.site", () => new IReaderWebNovelSiteParser());

class IReaderWebNovelSiteParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        const selector = "li.wp-manga-chapter a";
        if (!selector) {
            return util.hyperlinksToChapterList(dom.body || dom.documentElement);
        }
        let nodes = [...dom.querySelectorAll(selector)];
        let links = nodes.map(node => (node.tagName === "A") ? node : node.querySelector("a"))
            .filter(a => a && a.href);
        let chapters = links.map(a => util.hyperLinkToChapter(a)).reverse();
        if (chapters.length === 0) {
            chapters = await this.fetchChapterUrlsFromAjax(dom, true);
            if (chapters.length === 0) {
                let base = dom.baseURI.replace(/\/$/, "");
                let ajaxUrl = `${base}/ajax/chapters/`;
                let ajaxDom = (await HttpClient.wrapFetch(ajaxUrl, {
                    fetchOptions: { method: "POST", credentials: "include" }
                })).responseXML;
                chapters = [...ajaxDom.querySelectorAll("a")]
                    .map(a => util.hyperLinkToChapter(a))
                    .reverse();
            }
        }
        return chapters;
    }

    findContent(dom) {
        const selector = "div.reading-content h3, div.reading-content p";
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

    findChapterTitle(dom, webPage) {
        let title = (() => {
            const selector = ".cha-tit";
            return selector ? dom.querySelector(selector) : null;
        })();
        return title ?? (webPage ? webPage.title : null);
    }

    extractTitleImpl(dom) {
        const selector = ".post-title h1";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    findCoverImageUrl(dom) {
        const selector = ".summary_image a img";
        let img = selector ? dom.querySelector(selector) : null;
        return img?.getAttribute("src") || super.findCoverImageUrl(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        const selector = ".description-summary p";
        return selector ? [...dom.querySelectorAll(selector)] : [];
    }
}
