"use strict";

parserFactory.register("dobytranslations.com", () => new LightNovelCrawlerDobytranslationsParser());


class LightNovelCrawlerDobytranslationsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        const selector = ".eplister li a";
        if (!selector) {
            return util.hyperlinksToChapterList(dom.body || dom.documentElement);
        }
        let nodes = [...dom.querySelectorAll(selector)];
        let links = nodes.map(node => (node.tagName === "A") ? node : node.querySelector("a"))
            .filter(a => a && a.href);
        let chapters = links.map(a => util.hyperLinkToChapter(a));
        let firstLi = dom.querySelector(".eplister li");
        let className = firstLi?.getAttribute("class") || "";
        let dataNum = firstLi?.getAttribute("data-num") || "0";
        let reverse = (dataNum === "1") || (!className.includes("tseplsfrst"));
        if (reverse) {
            chapters = chapters.reverse();
        }
        return chapters;
    }

    findContent(dom) {
        const selector = "#readernovel, #readerarea, .entry-content";
        if (selector) {
            let content = dom.querySelector(selector);
            if (content) {
                return content;
            }
        }
        return dom.body || dom.documentElement;
    }

    findChapterTitle(dom, webPage) {
        let title = (() => {
            const selector = null;
            return selector ? dom.querySelector(selector) : null;
                        
        })();
        return title ?? (webPage ? webPage.title : null);
    }

    extractTitleImpl(dom) {
        const selector = "h1.entry-title";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        const selector = ".spe a[href*='/writer/']";
        if (selector) {
            let authors = [...dom.querySelectorAll(selector)]
                .map(e => e.textContent.trim())
                .filter(t => !util.isNullOrEmpty(t));
            if (authors.length > 0) {
                return authors.join(", ");
            }
        }
        return super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        const selector = ".thumbook img, meta[property='og:image'], .sertothumb img";
        if (selector) {
            let node = dom.querySelector(selector);
            if (node) {
                if (node.tagName === "META") {
                    let content = node.getAttribute("content");
                    if (!util.isNullOrEmpty(content)) {
                        return content;
                    }
                }
                if (node.tagName === "IMG") {
                    return node.getAttribute("data-src") || node.src || node.getAttribute("src");
                }
            }
            return util.getFirstImgSrc(dom, selector);
        }
        return super.findCoverImageUrl(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        const selector = ".entry-content";
        return selector ? [...dom.querySelectorAll(selector)] : [];
    }

    removeUnwantedElementsFromContentElement(element) {
        const removeSelectors = [];
        const removeTags = ["h3"];
        for (let selector of removeSelectors) {
            util.removeChildElementsMatchingSelector(element, selector);
        }
        for (let tag of removeTags) {
            util.removeElements(element.querySelectorAll(tag));
        }
        super.removeUnwantedElementsFromContentElement(element);
    }
}
