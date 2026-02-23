"use strict";

parserFactory.register("www.ruochu.com", () => new NovelDownloaderWwwRuochuComParser());

class NovelDownloaderWwwRuochuComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let bookId = dom.baseURI.match(/book\/(\d+)/)?.[1];
        if (!bookId) {
            return [];
        }
        let tocUrl = `https://www.ruochu.com/chapter/${bookId}/`;
        let tocDom = (await HttpClient.wrapFetch(tocUrl)).responseXML;
        let links = [...tocDom.querySelectorAll("div.bd li > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("div.page-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.hd h1 > span");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.pattern-cover-author a.name");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector("div.summary pre");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.pic img");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null && element.innerHTML != null) {
            element.innerHTML = element.innerHTML.replace(/\n/g, "<br/><br/>");
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom, webPage) {
        let title = dom.querySelector("h1");
        if (title != null) {
            return title;
        }
        return super.findChapterTitle(dom, webPage) ?? (webPage ? webPage.title : null);
    }
}
