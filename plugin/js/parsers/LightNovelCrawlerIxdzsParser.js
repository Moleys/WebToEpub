"use strict";

parserFactory.register("ixdzs8.tw", () => new LightNovelCrawlerIxdzsParser());
parserFactory.register("tw.m.ixdzs.com", () => new LightNovelCrawlerIxdzsParser());


class LightNovelCrawlerIxdzsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let baseUrl = LightNovelCrawlerIxdzsParser.rectifyUrl(dom.baseURI.split("?")[0]);
        let lastLink = dom.querySelector("ul.u-chapter > li:nth-child(1) > a");
        if (!lastLink) {
            return [];
        }
        let lastUrl = new URL(lastLink.getAttribute("href"), baseUrl).href;
        let lastId = parseInt(lastUrl.split("/").pop().replace(/^p/, "").replace(".html", "").trim(), 10);
        let chapters = [];
        for (let chapId = 1; chapId <= lastId; chapId++) {
            chapters.push({
                sourceUrl: `${baseUrl}/p${chapId}.html`,
                title: `Chapter ${chapId}`
            });
        }
        return chapters;
    }

    findContent(dom) {
        return dom.querySelector("article.page-content") || dom.body || dom.documentElement;
    }

    findChapterTitle(dom, webPage) {
        let title = (() => {
            const selector = null;
            return selector ? dom.querySelector(selector) : null;
                        
        })();
        return title ?? (webPage ? webPage.title : null);
    }

    extractTitleImpl(dom) {
        const selector = "div.n-text h1";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        let author = dom.querySelector("a.bauthor");
        return author?.textContent?.trim() ?? super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector("div.n-img > img");
        if (img) {
            return img.getAttribute("data-src") || img.src || img.getAttribute("src");
        }
        return super.findCoverImageUrl(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector("p#intro");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findChapterTitle(dom, webPage) {
        return dom.querySelector("article.page-content > h3") ?? (webPage ? webPage.title : null);
    }

    getInformationEpubItemChildNodes(dom) {
        const selector = null;
        return selector ? [...dom.querySelectorAll(selector)] : [];
    }

    removeUnwantedElementsFromContentElement(element) {
        const removeSelectors = ["p.abg"];
        const removeTags = [];
        for (let selector of removeSelectors) {
            util.removeChildElementsMatchingSelector(element, selector);
        }
        for (let tag of removeTags) {
            util.removeElements(element.querySelectorAll(tag));
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    static rectifyUrl(url) {
        let fixed = url.endsWith("/") ? url.slice(0, -1) : url;
        if (fixed.includes("https://tw.m.ixdzs.com")) {
            return fixed.replace("https://tw.m.ixdzs.com", "https://ixdzs8.tw");
        }
        if (fixed.includes("https://www.aixdzs.com")) {
            return fixed.replace("https://www.aixdzs.com", "https://ixdzs8.com");
        }
        return fixed;
    }

}

