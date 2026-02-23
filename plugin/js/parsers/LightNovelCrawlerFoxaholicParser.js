"use strict";

parserFactory.register("18.foxaholic.com", () => new LightNovelCrawlerFoxaholicParser());
parserFactory.register("foxaholic.com", () => new LightNovelCrawlerFoxaholicParser());
parserFactory.register("global.foxaholic.com", () => new LightNovelCrawlerFoxaholicParser());


class LightNovelCrawlerFoxaholicParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll(".wp-manga-chapter a")]
            .filter(a => a && a.href);
        let chapters = links.map(a => util.hyperLinkToChapter(a)).reverse();
        if (chapters.length === 0) {
            chapters = await this.fetchChapterUrlsFromAjax(dom, true);
        }
        return chapters;
    }

    findContent(dom) {
        return dom.querySelector(".entry-content_wrap") || dom.body || dom.documentElement;
    }

    findChapterTitle(dom, webPage) {
        let title = (() => {
            const selector = null;
            return selector ? dom.querySelector(selector) : null;
                        
        })();
        return title ?? (webPage ? webPage.title : null);
    }

    async fetchChapter(url) {
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        let blocked = chapterDom.querySelector(".text-left a");
        if (blocked && /Chapter/i.test(blocked.textContent || "")) {
            chapterDom = (await HttpClient.wrapFetch(blocked.href)).responseXML;
        }
        return chapterDom;
    }

    extractTitleImpl(dom) {
        return super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        const selector = ".author-content a[href*=\"novel-author\"]";
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
        let img = dom.querySelector(".summary_image a img");
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
