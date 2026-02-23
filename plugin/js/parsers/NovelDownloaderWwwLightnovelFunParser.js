"use strict";

parserFactory.register("www.lightnovel.fun", () => new NovelDownloaderWwwLightnovelFunParser());

class NovelDownloaderWwwLightnovelFunParser extends Parser {
    constructor() {
        super();
        this.bookInfo = null;
    }

    async getChapterUrls(dom) {
        const isSeries = dom.baseURI.includes("/series");
        if (isSeries) {
            this.bookInfo = {
                title: dom.querySelector("div.top-title h3")?.textContent?.trim() || null,
                author: dom.querySelector("div.author-name > span")?.textContent?.trim() || null,
                intro: dom.querySelector("pre.intro")?.textContent?.trim() || null,
                cover: null
            };
            let chapters = this.extractNuxtChapters();
            if (chapters.length > 0) {
                return chapters;
            }
            let links = [...dom.querySelectorAll("a")].filter(a => a.href && a.href.includes("/detail/"));
            return links.map(link => util.hyperLinkToChapter(link));
        }
        this.bookInfo = {
            title: dom.querySelector("h2.article-title")?.textContent?.trim() || null,
            author: dom.querySelector("div.author-name > span")?.textContent?.trim() || null,
            intro: null,
            cover: null
        };
        return [{ sourceUrl: dom.baseURI, title: this.bookInfo.title || "Content", newArc: null }];
    }

    extractNuxtChapters() {
        let chapters = [];
        let pages = window.__NUXT__?.data?.[0]?.pages;
        if (!Array.isArray(pages)) {
            return chapters;
        }
        let chapterNumber = 0;
        for (const pageGroup of pages) {
            if (!Array.isArray(pageGroup)) {
                continue;
            }
            for (const item of pageGroup) {
                if (!item || !item.aid) {
                    continue;
                }
                chapterNumber += 1;
                const chapterName = item.title || `Chapter ${chapterNumber}`;
                const chapterUrl = `https://www.lightnovel.fun/cn/detail/${item.aid}`;
                chapters.push({ sourceUrl: chapterUrl, title: chapterName, newArc: null });
            }
        }
        return chapters;
    }

    findContent(dom) {
        return dom.querySelector("article#article-main-contents");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h2.article-title") || this.bookInfo?.title || null;
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.author-name > span");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return this.bookInfo?.author
            ? this.bookInfo.author.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim()
            : super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector("pre.intro");
        if (intro != null) {
            return intro.textContent.trim();
        }
        return this.bookInfo?.intro || super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return this.bookInfo?.cover || util.getFirstImgSrc(dom, "img");
    }

    findChapterTitle(dom, webPage) {
        let title = dom.querySelector("h1, h2.article-title");
        if (title != null) {
            return title;
        }
        return super.findChapterTitle(dom, webPage) ?? (webPage ? webPage.title : null);
    }
}
