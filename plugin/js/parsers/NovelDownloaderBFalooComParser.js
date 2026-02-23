"use strict";

parserFactory.register("b.faloo.com", () => new NovelDownloaderBFalooComParser());

class NovelDownloaderBFalooComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("div.C-Fo-Zuo div.DivTable a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("div.noveContent");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1#novelName");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".rentouOne");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector("div.T-L-T-C-Box1");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "img.imgcss");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            util.removeChildElementsMatchingSelector(element, "b");
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
