"use strict";

parserFactory.register("www.wangshugu.org", () => new NovelDownloaderWwwWangshuguOrgParser());

class NovelDownloaderWwwWangshuguOrgParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let bookId = /(\d+)\/?$/.exec(dom.baseURI)?.[1];
        if (!bookId) {
            return [];
        }
        let tocUrl = `${document.location.origin}/books/book${bookId}.html`;
        let tocDom = (await HttpClient.wrapFetch(tocUrl)).responseXML;
        let links = [...tocDom.querySelectorAll("#at > tbody td > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("#contents > *");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("#content > dd > h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("#at > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(4)");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector("#content > dd:nth-child(7) > p:nth-child(3)");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".hst > img");
    }

    findChapterTitle(dom, webPage) {
        let title = dom.querySelector("h1");
        if (title != null) {
            return title;
        }
        return super.findChapterTitle(dom, webPage) ?? (webPage ? webPage.title : null);
    }
}
