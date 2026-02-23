"use strict";

parserFactory.register("lightnovelreader.me", () => new LightNovelCrawlerLightnovelReaderParser());
parserFactory.register("readlightnovel.online", () => new LightNovelCrawlerLightnovelReaderParser());


class LightNovelCrawlerLightnovelReaderParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let chapters = [];
        let tabs = [...dom.querySelectorAll(".novels-detail-chapters-btn-list a[data-tab]")].reverse();
        for (let tab of tabs) {
            let tabId = tab.getAttribute("data-tab");
            if (!tabId) {
                continue;
            }
            let safeId = (typeof CSS !== "undefined" && CSS.escape) ? CSS.escape(tabId) : tabId;
            let links = [...dom.querySelectorAll(`.novels-detail-chapters#${safeId} a`)].reverse();
            chapters = chapters.concat(links.map(a => util.hyperLinkToChapter(a)));
        }
        if (chapters.length === 0) {
            chapters = await this.fetchChapterUrlsFromAjax(dom, true);
        }
        return chapters;
    }

    findContent(dom) {
        const selector = "#chapterText";
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
        const selector = ".section-header-title";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        const selector = ".container .novels-detail-right-in-right a[href*=\"/author/\"]";
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
        let img = dom.querySelector(".novels-detail-left img");
        if (img) {
            return img.getAttribute("data-src") || img.src || img.getAttribute("src");
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
