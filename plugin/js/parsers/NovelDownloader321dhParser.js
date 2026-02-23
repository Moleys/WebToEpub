"use strict";

parserFactory.register("321dh.org", () => new NovelDownloader321dhParser());

class NovelDownloader321dhParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let chapterPageLink = dom.querySelector("div.book_newchap > div.tit > span > em > a");
        if (chapterPageLink == null) {
            return [];
        }
        let tocDom = (await HttpClient.wrapFetch(chapterPageLink.href)).responseXML;
        let links = [...tocDom.querySelectorAll("ul.mulu_list > li > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("div.read-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.box_info p:first-of-type > a:first-of-type");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("div.intro");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.pic > img.fengmian2");
    }
}
