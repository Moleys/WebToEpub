"use strict";

parserFactory.register("es.mtlnovel.com", () => new LightNovelCrawlerMtlnovelParser());
parserFactory.register("es.mtlnovels.com", () => new LightNovelCrawlerMtlnovelParser());
parserFactory.register("fr.mtlnovel.com", () => new LightNovelCrawlerMtlnovelParser());
parserFactory.register("fr.mtlnovels.com", () => new LightNovelCrawlerMtlnovelParser());
parserFactory.register("id.mtlnovel.com", () => new LightNovelCrawlerMtlnovelParser());
parserFactory.register("id.mtlnovels.com", () => new LightNovelCrawlerMtlnovelParser());


class LightNovelCrawlerMtlnovelParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let baseUrl = dom.baseURI.split("?")[0];
        if (!baseUrl.endsWith("/")) {
            baseUrl += "/";
        }
        let tocUrl = baseUrl + "chapter-list/";
        let tocDom = (await HttpClient.wrapFetch(tocUrl)).responseXML;
        let baseCompare = baseUrl.replace(/\/$/, "");
        let links = [...tocDom.querySelectorAll(".post-content .ch-list a.ch-link")]
            .filter(a => a && a.href && a.href.includes(baseCompare));
        return links.map(a => util.hyperLinkToChapter(a)).reverse();
    }

    findContent(dom) {
        const selector = ".post .post-content .par";
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
        const selector = "article .entry-title, h1";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        const selector = "table.info a[href*=\"/novel-author/\"]";
        if (selector) {
            let authors = [...dom.querySelectorAll(selector)]
                .map(e => e.textContent.trim())
                .filter(t => !util.isNullOrEmpty(t));
            if (authors.length > 0) {
                return authors.join(", ");
            }
        }
        return super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector(".post-content amp-img[fallback]");
        if (img) {
            return img.getAttribute("src");
        }
        return super.findCoverImageUrl(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        const selector = null;
        return selector ? [...dom.querySelectorAll(selector)] : [];
    }

    removeUnwantedElementsFromContentElement(element) {
        const removeSelectors = [];
        const removeTags = [];
        for (let selector of removeSelectors) {
            util.removeChildElementsMatchingSelector(element, selector);
        }
        for (let tag of removeTags) {
            util.removeElements(element.querySelectorAll(tag));
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

}

