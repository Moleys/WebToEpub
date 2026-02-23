"use strict";

parserFactory.register("www.xiaoshuowu.com", () => new NovelDownloaderWwwXiaoshuowuComParser());

class NovelDownloaderWwwXiaoshuowuComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocDom = dom;
        let links = [...tocDom.querySelectorAll("li.chapter > a")];
        if (links.length === 0) {
            let bookUrl = this.buildBookUrl(dom.baseURI);
            if (!bookUrl) {
                return [];
            }
            tocDom = (await HttpClient.wrapFetch(bookUrl)).responseXML;
            links = [...tocDom.querySelectorAll("li.chapter > a")];
        }
        return this.extractChaptersWithSections(tocDom, links);
    }

    buildBookUrl(url) {
        try {
            let parsed = new URL(url);
            let match = parsed.pathname.match(/\/book\/(\d+)\//);
            if (!match) {
                return null;
            }
            return `${parsed.origin}/book/${match[1]}/`;
        } catch {
            return null;
        }
    }

    extractChaptersWithSections(dom, links) {
        let nodes = [...dom.querySelectorAll(".volume, li.chapter > a")];
        if (nodes.length === 0) {
            return links.map(link => util.hyperLinkToChapter(link));
        }
        let chapters = [];
        let pendingArc = null;
        let currentArc = null;
        for (const node of nodes) {
            if (node.classList && node.classList.contains("volume")) {
                pendingArc = (node.textContent || "").trim();
                continue;
            }
            if (node.matches && node.matches("li.chapter > a")) {
                let arc = pendingArc;
                let newArc = (arc && arc !== currentArc) ? arc : null;
                currentArc = arc || currentArc;
                pendingArc = null;
                chapters.push(util.hyperLinkToChapter(node, newArc));
            }
        }
        return chapters;
    }

    findContent(dom) {
        return dom.querySelector("#acontent");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.divbox:nth-child(2) > div:nth-child(2) > div:nth-child(1) > span:nth-child(1)");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.divbox:nth-child(2) > div:nth-child(2) > div:nth-child(1) > span:nth-child(2) > a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("div.tabvalue:nth-child(1) > div:nth-child(1)");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.divbox:nth-child(2) > div:nth-child(1) > a:nth-child(1) > img");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            rm("div[align]", true, element);
            rm(".tishi", true, element);
            rm("h1", false, element);
            rms(["(??? www.xiaoshuowu.com)", "??? www.xiaoshuowu.com"], element);
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

function rms(filters, dom) {
    for (const ad of filters) {
        if (typeof ad === "string") {
            dom.innerHTML = dom.innerHTML.split(ad).join("");
        } else if (ad instanceof RegExp) {
            dom.innerHTML = dom.innerHTML.replace(ad, "");
        }
    }
    return dom;
}

