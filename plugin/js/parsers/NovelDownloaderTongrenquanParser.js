"use strict";

parserFactory.register("tongrenquan.me", () => new NovelDownloaderTongrenquanParser());

class NovelDownloaderTongrenquanParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("div.book_list > ul.clearfix > li > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector(".read_chapterDetail");
    }

    extractTitleImpl(dom) {
        let title = dom.querySelector(".infos > h1");
        if (title != null && title.textContent != null) {
            return title.textContent.split("(")[0].trim();
        }
        return title;
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".date > span > a, .date > span");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").replace("\u4f5c\u8005\uff1a", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector(".infos > p");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".pic > img");
    }
}

