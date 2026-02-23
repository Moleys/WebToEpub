"use strict";

parserFactory.register("lreads.com", () => new LightNovelCrawlerLeYueDuParser());
parserFactory.register("m.27k.net", () => new LightNovelCrawlerLeYueDuParser());
parserFactory.register("so.27k.net", () => new LightNovelCrawlerLeYueDuParser());
parserFactory.register("tw.27k.net", () => new LightNovelCrawlerLeYueDuParser());


class LightNovelCrawlerLeYueDuParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let baseUrl = dom.baseURI.split("?")[0];
        let tocUrl = baseUrl.replace("/book/", "/read/").replace(".html", "/");
        let tocDom = (await HttpClient.wrapFetch(tocUrl)).responseXML;
        let links = [...tocDom.querySelectorAll("div#catalog ul li a")]
            .filter(a => a && a.href);
        return links.map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        const selector = "div.txtnav";
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
        const selector = "div.booknav2 h1 a";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        const selector = ".booknav2 p a[href*=\"/author/\"]";
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
        let img = dom.querySelector("div.bookimg2 img");
        if (img) {
            return img.getAttribute("data-src") || img.src || img.getAttribute("src");
        }
        return super.findCoverImageUrl(dom);
    }

    extractSubject(dom) {
        let tag = dom.querySelector(".booknav2 p a[href*=\"/sort/\"]");
        return tag?.textContent?.trim() ?? "";
    }

    getInformationEpubItemChildNodes(dom) {
        const selector = null;
        return selector ? [...dom.querySelectorAll(selector)] : [];
    }

    removeUnwantedElementsFromContentElement(element) {
        const removeSelectors = ["div.txtinfo", "div#txtright", "div.baocuo", "h1"];
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

