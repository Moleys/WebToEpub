"use strict";

parserFactory.register("www.shuhai.com", () => new NovelDownloaderWwwShuhaiComParser());

class NovelDownloaderWwwShuhaiComParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 500;
    }

    async getChapterUrls(dom) {
        let list = dom.querySelectorAll("#catalog > .chapter-item");
        let chapters = [];
        let pendingArc = null;
        let currentArc = null;
        for (const node of Array.from(list)) {
            if (node.nodeName === "SPAN") {
                pendingArc = (node.textContent || "").trim();
                continue;
            }
            if (node.nodeName === "DIV") {
                let a = node.querySelector("a");
                if (a) {
                    let arc = pendingArc;
                    let newArc = (arc && arc !== currentArc) ? arc : null;
                    currentArc = arc || currentArc;
                    pendingArc = null;
                    chapters.push(util.hyperLinkToChapter(a, newArc));
                }
            }
        }
        return chapters;
    }

    findContent(dom) {
        return dom.querySelector("#reader-content > div:nth-child(1)");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.book-info-bookname > span:nth-child(1)");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.book-info-bookname > span:nth-child(2)");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector("div.book-info-bookintro") || dom.querySelector("div.book-info-bookintro-all");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector(".book-cover-wrapper > img");
        if (img) {
            return img.getAttribute("data-original") || img.src;
        }
        return null;
    }

    findChapterTitle(dom, webPage) {
        let title = dom.querySelector("div.chapter-name");
        if (title && title.textContent) {
            let t = title.textContent.replace("\u6b63\u6587 ", "").trim();
            let h1 = dom.createElement("h1");
            h1.textContent = t;
            return h1;
        }
        return super.findChapterTitle(dom, webPage);
    }

    async fetchChapter(url) {
        let options = { makeTextDecoder: () => new TextDecoder("gbk") };
        return (await HttpClient.wrapFetch(url, options)).responseXML;
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            rm("div.chaper-info", false, element);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }
}

function rm(selector, deep, dom) {
    if (!dom) {
        return;
    }
    let nodes = dom.querySelectorAll(selector);
    nodes.forEach(node => {
        if (deep) {
            node.remove();
        } else if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    });
}

