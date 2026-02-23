"use strict";

parserFactory.register("www.linovel.net", () => new NovelDownloaderLinovelParser());

class NovelDownloaderLinovelParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let sections = dom.querySelectorAll(".section-list > .section");
        let chapters = [];
        let currentArc = null;
        let chapterNumber = 0;
        for (const section of Array.from(sections)) {
            let sectionName = section.querySelector(".volume-info > h2.volume-title > a")?.textContent?.trim() || null;
            let newArc = (sectionName && sectionName !== currentArc) ? sectionName : null;
            if (sectionName) {
                currentArc = sectionName;
            }
            let chapterNodes = section.querySelectorAll(".chapter-list > .text-content-actual div.chapter");
            for (const chapterNode of Array.from(chapterNodes)) {
                let link = chapterNode.firstElementChild;
                if (!link || link.tagName !== "A") {
                    continue;
                }
                chapterNumber += 1;
                let chapterName = link.textContent?.trim() || `Chapter ${chapterNumber}`;
                chapters.push({
                    sourceUrl: link.href,
                    title: chapterName,
                    newArc: newArc
                });
                newArc = null;
            }
        }
        return chapters;
    }

    findContent(dom) {
        return dom.querySelector(".article-text");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".book-title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".author-frame > .novelist > div:nth-child(3) > a");
        if (authorLabel && authorLabel.textContent) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector(".about-text");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        let coverLink = dom.querySelector(".book-cover > a");
        if (coverLink && coverLink.getAttribute("href")) {
            return coverLink.getAttribute("href");
        }
        return util.getFirstImgSrc(dom, ".book-cover img");
    }

    extractLanguage() {
        return "zh";
    }

    findChapterTitle(dom, webPage) {
        let title = dom.querySelector(".article-title");
        if (title) {
            return title;
        }
        return super.findChapterTitle(dom, webPage) ?? (webPage ? webPage.title : null);
    }
}
