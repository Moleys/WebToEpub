"use strict";

parserFactory.register("www.qidian.com", () => new NovelDownloaderWwwQidianComParser());

class NovelDownloaderWwwQidianComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll(".catalog-volume ul.volume-chapters a")];
        links = links.filter(link => link.href && !link.href.includes("javascript"));
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("div.read-content, .content-text, #content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("#bookName");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".author, #authorId, .book-info .writer");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector("#book-intro-detail");
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
