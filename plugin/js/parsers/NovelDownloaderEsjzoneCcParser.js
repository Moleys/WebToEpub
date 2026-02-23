"use strict";

parserFactory.register("esjzone.cc", () => new NovelDownloaderEsjzoneCcParser());

class NovelDownloaderEsjzoneCcParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let chapterList = dom.querySelector("#chapterList");
        if (!chapterList) {
            return [];
        }
        let nodes = Array.from(chapterList.childNodes);
        let chapters = [];
        let pendingArc = null;
        for (const node of nodes) {
            let elem = node;
            if (elem.nodeType !== Node.ELEMENT_NODE) {
                continue;
            }
            let tag = elem.tagName;
            if (tag === "P") {
                pendingArc = (elem.textContent || "").trim();
                continue;
            }
            if (tag === "DETAILS") {
                let summary = elem.querySelector("summary");
                let sectionName = summary ? summary.textContent.trim() : null;
                pendingArc = sectionName;
                let links = [...elem.querySelectorAll("a")];
                for (const link of links) {
                    let chapterName = this.getChapterName(link);
                    link.textContent = chapterName;
                    let newArc = pendingArc;
                    pendingArc = null;
                    chapters.push(util.hyperLinkToChapter(link, newArc));
                }
                continue;
            }
            if (tag === "A") {
                let link = elem;
                let chapterName = this.getChapterName(link);
                link.textContent = chapterName;
                let newArc = pendingArc;
                pendingArc = null;
                chapters.push(util.hyperLinkToChapter(link, newArc));
            }
        }
        return chapters;
    }

    getChapterName(link) {
        let p = link.querySelector("p");
        if (p && p.textContent) {
            return p.textContent.trim();
        }
        return (link.textContent || "").trim();
    }

    findContent(dom) {
        return dom.querySelector(".forum-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".book-detail h2");
    }

    extractAuthor(dom) {
        let authorLi = Array.from(dom.querySelectorAll("ul.book-detail li"))
            .find(li => (li.textContent || "").includes("\u4f5c\u8005:"));
        let authorLink = authorLi ? authorLi.querySelector("a") : null;
        if (authorLink && authorLink.textContent) {
            return authorLink.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector(".description");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.product-gallery img");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            rm("h3", true, element);
            rm("footer", true, element);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
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
