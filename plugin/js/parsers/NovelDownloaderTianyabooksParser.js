"use strict";

parserFactory.register("www.tianyabooks.com", () => new NovelDownloaderTianyabooksParser());

class NovelDownloaderTianyabooksParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll(".book > dl > dd > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("#main");
    }

    extractTitleImpl(dom) {
        let title = dom.querySelector(".book > h1");
        if (title != null && title.textContent != null) {
            return title.textContent.replace(/[\\u300a\\u300b]/g, "").trim();
        }
        return title;
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".book > h2 > a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector(".description");
        if (introDom != null) {
            let clone = introDom.cloneNode(true);
            rm("h3", false, clone);
            return clone.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl() {
        return null;
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            rm("div.crumb", false, element);
            rm("h1", false, element);
            rm('p[align="center"]', false, element);
            rm("table", true, element);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }
}

function rm(selector, all, dom) {
    if (all) {
        dom.querySelectorAll(selector).forEach(e => e.remove());
    } else {
        let element = dom.querySelector(selector);
        if (element != null) {
            element.remove();
        }
    }
}

