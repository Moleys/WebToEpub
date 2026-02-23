"use strict";

parserFactory.register("jingcaiyuedu6.com", () => new NovelDownloaderJingcaiyuedu6Parser());

class NovelDownloaderJingcaiyuedu6Parser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocLink = dom.querySelector("a.red-btn:nth-child(3)");
        if (!tocLink) {
            return [];
        }
        let tocDom = (await HttpClient.wrapFetch(tocLink.href)).responseXML;
        let links = [...tocDom.querySelectorAll("dd.col-md-4 > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("#htmlContent");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".book-info > h1 > em");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".book-info > h1 > a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector(".book-info > p.intro");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".book-img-cover");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            rm2(["\u7cbe\u5f69\u5c0f\u8bf4\u7f51\u6700\u65b0\u5730\u5740"], element);
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

function rm2(filters, dom) {
    function doRemove(nodes) {
        Array.from(nodes.childNodes).forEach(node => {
            let text = node.nodeName === "#text"
                ? (node.textContent || "")
                : (node.innerText || "");
            if (text.length < 200 || node.nodeName === "#text") {
                for (const filter of filters) {
                    if (filter instanceof RegExp) {
                        if (filter.test(text)) {
                            node.remove();
                        }
                    } else if (typeof filter === "string") {
                        if (text.includes(filter)) {
                            node.remove();
                        }
                    }
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                doRemove(node);
            }
        });
    }
    doRemove(dom);
}
