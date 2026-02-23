"use strict";

parserFactory.register("www.uukanshu.com", () => new NovelDownloaderWwwUukanshuComParser());

class NovelDownloaderWwwUukanshuComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("#chapterList > li > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("#contentbox");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("dd.jieshao_content > h1 > a");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("dd.jieshao_content > h2 > a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector("dd.jieshao_content > h3");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "a.bookImg > img");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            util.removeChildElementsMatchingSelector(element, ".ad_content");
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
