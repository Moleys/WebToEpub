"use strict";

parserFactory.register("xbanxia.la", () => new NovelDownloaderXbanxiaLaParser());

class NovelDownloaderXbanxiaLaParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("div.book-list > ul > li > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("#nr1");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.book-describe > h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.book-describe > p:first-of-type > a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("div.book-describe > div.describe-html > p:first-of-type");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book-img > img");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            rm("script", true, element);
            rm("span", true, element);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
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
