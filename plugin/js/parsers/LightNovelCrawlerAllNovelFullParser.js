"use strict";

parserFactory.register("novgo.net", () => new LightNovelCrawlerAllNovelFullParser());


class LightNovelCrawlerAllNovelFullParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let idTag = dom.querySelector("#rating[data-novel-id]");
        let novelId = idTag ? idTag.getAttribute("data-novel-id") : null;
        if (!novelId) {
            return util.hyperlinksToChapterList(dom.body || dom.documentElement);
        }
        let baseUrl = new URL(dom.baseURI).origin + "/";
        let scriptHasOption = [...dom.querySelectorAll("script")].some(s => /ajaxChapterOptionUrl\s+=/.test(s.textContent || ""));
        let url = scriptHasOption
            ? baseUrl + "ajax-chapter-option?novelId=" + novelId
            : baseUrl + "ajax/chapter-archive?novelId=" + novelId;
        let tocDom = await Parser.fetchDomFromUrl(url, { method: "GET", credentials: "include" });
        let nodes = [...tocDom.querySelectorAll("ul.list-chapter > li > a[href], select > option[value]")];
        let chapters = nodes.map(node => {
            if (node.tagName === "A") {
                return util.hyperLinkToChapter(node);
            }
            let href = node.getAttribute("value");
            let title = node.textContent.trim();
            if (!href) {
                return null;
            }
            return {
                sourceUrl: util.resolveRelativeUrl(url, href),
                title: title,
                newArc: null
            };
        }).filter(c => c && c.sourceUrl);
        return chapters;
    }

    findContent(dom) {
        const selector = "#chr-content, #chapter-content";
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
        const selector = "h3.title";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        const selector = ".info a[href*='/a/'], .info a[href*='/au/'], .info a[href*='author']";
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
        const selector = ".book img";
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
        const selector = ".desc-text";
        return selector ? [...dom.querySelectorAll(selector)] : [];
    }

    removeUnwantedElementsFromContentElement(element) {
        const removeSelectors = [];
        const removeTags = [];
        for (let selector of removeSelectors) {
            util.removeChildElementsMatchingSelector(element, selector);
        }
        for (let tag of removeTags) {
            util.removeElements(element.querySelectorAll(tag));
        }
        super.removeUnwantedElementsFromContentElement(element);
    }
}
