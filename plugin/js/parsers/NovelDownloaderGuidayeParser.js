"use strict";

parserFactory.register("b.guidaye.com", () => new NovelDownloaderGuidayeParser());

class NovelDownloaderGuidayeParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let totalPages = this.getTotalPages(dom);
        let sid = dom.querySelector("div#bookiddata")?.dataset?.sid || "";
        if (util.isNullOrEmpty(sid) || totalPages <= 0) {
            return [];
        }
        let api = "https://b.guidaye.com/e/extend/bookpage/pages.php?id=" + sid;
        let chapters = [];
        for (let i = 0; i < totalPages; i++) {
            let response = await fetch(api, {
                method: "POST",
                mode: "cors",
                cache: "no-cache",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                },
                body: "pageNum=" + i
            });
            if (!response.ok) {
                continue;
            }
            let json = await response.json();
            let partial = (json.list || []).map(item => ({
                sourceUrl: item.pic,
                title: item.title
            }));
            if (chapterUrlsUI) {
                chapterUrlsUI.showTocProgress(partial);
            }
            chapters = chapters.concat(partial);
        }
        return chapters;
    }

    getTotalPages(dom) {
        let pageText = dom.querySelector("div.pager > span:nth-child(1)")?.textContent || "";
        let totalText = pageText.replace(/\u9875\u6b21\uff1a.+\//g, "").trim();
        let total = parseInt(totalText);
        return Number.isFinite(total) ? total : 0;
    }

    findContent(dom) {
        return dom.querySelector("div#nr1");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.book-describe > h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.book-describe > p");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").replace("\u4f5c\u54c1\u96c6", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("div.describe-html");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book-img > img");
    }
}
