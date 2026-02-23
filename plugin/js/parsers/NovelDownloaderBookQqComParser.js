"use strict";

parserFactory.register("book.qq.com", () => new NovelDownloaderBookQqComParser());

class NovelDownloaderBookQqComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let chapters = [];
        let panels = dom.querySelectorAll(".tab-panel");
        let panel = panels.length > 1 ? panels[1] : dom;
        let bookDirs = panel.querySelectorAll(".book-dir");
        let listRoot = bookDirs.length > 1 ? bookDirs[1] : (bookDirs[0] || panel);
        let items = listRoot.querySelectorAll("li.list");
        for (const item of Array.from(items)) {
            let link = item.querySelector("a[href]");
            if (!link || !link.href) {
                continue;
            }
            let title = link.textContent?.trim() || link.title || link.href;
            let locked = item.querySelector(".lock") != null;
            chapters.push({
                sourceUrl: link.href,
                title: title,
                newArc: null,
                isIncludeable: !locked
            });
        }
        return chapters;
    }

    findContent(dom) {
        return dom.querySelector("#article");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".book-title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".book-meta a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector(".book-intro");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".book-cover > img");
    }

    async fetchChapter(url) {
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        let content = this.findContent(chapterDom);
        if (content != null && (content.childElementCount || 0) >= 10) {
            return chapterDom;
        }
        try {
            let iframeDom = await HttpClient.fetchIframeDom(url, {
                waitForSelector: "#article",
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
        let title = dom.querySelector("h1.chapter-title");
        if (title != null) {
            return title;
        }
        return super.findChapterTitle(dom, webPage) ?? (webPage ? webPage.title : null);
    }
}
