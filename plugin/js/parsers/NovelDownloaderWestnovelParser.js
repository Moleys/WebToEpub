"use strict";

parserFactory.register("www.westnovel.com", () => new NovelDownloaderWestnovelParser());

class NovelDownloaderWestnovelParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll(".chapterlist > dd > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("#BookText");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".btitle > h1 > a");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".btitle > em:nth-child(2)");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector(".intro-p > p:nth-child(1)");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".img-img");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            rm("div.ads", true, element);
            rm("div.link", true, element);
            rm("h4", true, element);
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
