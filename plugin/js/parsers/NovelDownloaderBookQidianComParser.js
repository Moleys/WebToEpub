"use strict";

parserFactory.register("book.qidian.com", () => new NovelDownloaderBookQidianComParser());

class NovelDownloaderBookQidianComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("#j-catalogWrap a")];
        links = links.filter(link => link.href && !link.href.includes("javascript"));
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("div.read-content, .content-text, #content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".book-info > h1 > em");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".book-info .writer, .book-info > h1:nth-child(1) > span:nth-child(2)");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").replace(/\s+\u8457$/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector(".book-info-detail .book-intro");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#bookImg > img");
    }

    async fetchChapter(url) {
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        if (this.findContent(chapterDom) != null) {
            return chapterDom;
        }
        try {
            let iframeDom = await HttpClient.fetchIframeDom(url, {
                waitForSelector: ".content-text",
                minChildCount: 10
            });
            if (this.findContent(iframeDom) != null) {
                return iframeDom;
            }
        } catch {
            // ignore and fall back to chapterDom
        }
        return chapterDom;
    }

    findChapterTitle(dom, webPage) {
        let title = dom.querySelector("h1.title");
        if (title != null) {
            return title;
        }
        return super.findChapterTitle(dom, webPage) ?? (webPage ? webPage.title : null);
    }
}
