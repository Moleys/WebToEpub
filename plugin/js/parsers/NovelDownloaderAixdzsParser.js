"use strict";

parserFactory.register("aixdzs.com", () => new NovelDownloaderAixdzsParser());

class NovelDownloaderAixdzsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let items = [...dom.querySelectorAll("#i-chapter li")];
        if (items.length === 0) {
            let links = [...dom.querySelectorAll("#i-chapter li.chapter > a")];
            return links.map(link => util.hyperLinkToChapter(link));
        }
        let chapters = [];
        let currentArc = null;
        let lastArc = null;
        for (const item of items) {
            if (item.classList.contains("volume")) {
                currentArc = item.textContent?.trim() || null;
                continue;
            }
            let link = item.querySelector("a");
            if (!link) {
                continue;
            }
            let newArc = null;
            if (currentArc && currentArc !== lastArc) {
                newArc = currentArc;
                lastArc = currentArc;
            }
            chapters.push({
                sourceUrl: link.href,
                title: link.textContent?.trim() || "",
                newArc: newArc
            });
        }
        return chapters;
    }

    findContent(dom) {
        return dom.querySelector(".content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".d_info > h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".d_ac > ul:nth-child(1) > li:nth-child(1) > a:nth-child(2)");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector(".d_co");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".d_af > img");
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
    }
}
