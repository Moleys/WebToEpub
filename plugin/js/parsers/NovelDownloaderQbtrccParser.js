"use strict";

parserFactory.register("www.qbtr.cc", () => new NovelDownloaderQbtrccParser());

class NovelDownloaderQbtrccParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("ul.clearfix");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div.read_chapterDetail");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.infos > h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.infos > div.date > span");
        if (authorLabel != null) {
            return authorLabel.textContent.replace(/作\s*者[：:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("div.infos > p");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return "https://www.qbtr.cc/skin/default/images/bbb2.png";
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
    }
}


