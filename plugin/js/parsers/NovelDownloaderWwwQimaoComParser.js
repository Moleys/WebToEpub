"use strict";

parserFactory.register("www.qimao.com", () => new NovelDownloaderWwwQimaoComParser());

class NovelDownloaderWwwQimaoComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("ul.clearfix > li > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector(".article");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.title > span.txt");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.sub-title > span.txt > em > a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let meta = dom.querySelector("head > meta[name='description']");
        if (meta && meta.getAttribute("content")) {
            return meta.getAttribute("content").trim();
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.wrap-pic");
    }

    findChapterTitle(dom, webPage) {
        let title = dom.querySelector(".chapter-title");
        if (title != null) {
            return title;
        }
        return super.findChapterTitle(dom, webPage) ?? (webPage ? webPage.title : null);
    }
}
