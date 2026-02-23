"use strict";

parserFactory.register("quanshuzhai.com", () => new NovelDownloaderQuanshuzhaiParser());

class NovelDownloaderQuanshuzhaiParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("#list-chapterAll > dd > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector(".readcontent");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".booktitle");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("a.red");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector(".bookintro");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return null;
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
    }
}
