"use strict";

parserFactory.register("fanqienovel.com", () => new NovelDownloaderFanqienovelComParser());

class NovelDownloaderFanqienovelComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let chapters = [];
        let sections = [...dom.querySelectorAll(".page-directory-content > *")];
        let currentSection = null;
        for (const section of sections) {
            let volumeName = section.querySelector?.("div.volume")?.textContent?.trim() || null;
            if (volumeName) {
                currentSection = volumeName;
            }
            let chapterItems = section.querySelectorAll?.("div.chapter-item a") || [];
            let newArc = currentSection;
            for (const link of Array.from(chapterItems)) {
                chapters.push({
                    sourceUrl: link.href,
                    title: link.textContent?.trim() || link.title || link.href,
                    newArc: newArc
                });
                newArc = null;
            }
        }
        if (chapters.length === 0) {
            let links = [...dom.querySelectorAll("div.chapter-item a")];
            return links.map(link => util.hyperLinkToChapter(link));
        }
        return chapters;
    }

    findContent(dom) {
        return dom.querySelector(".muye-reader-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".info-name h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".author-name");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector(".page-abstract-content");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".book-cover img");
    }

    async fetchChapter(url) {
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        if (this.findContent(chapterDom) != null) {
            return chapterDom;
        }
        try {
            let iframeDom = await HttpClient.fetchIframeDom(url, {
                waitForSelector: ".muye-reader-content"
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
        let title = dom.querySelector("h1");
        if (title != null) {
            return title;
        }
        return super.findChapterTitle(dom, webPage) ?? (webPage ? webPage.title : null);
    }
}
