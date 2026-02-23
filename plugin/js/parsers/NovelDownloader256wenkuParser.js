"use strict";

parserFactory.register("www.256wenku.com", () => new NovelDownloader256wenkuParser());

class NovelDownloader256wenkuParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = dom.querySelectorAll(".catalog > li > a");
        return [...links].map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector(".book_con");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".art_tit");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("span.bookinfo:nth-child(1) > a, span.bookinfo:nth-child(1)");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/作\s*者[：:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector(".infotype > p");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
    }
}


