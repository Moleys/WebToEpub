"use strict";

parserFactory.register("www.soxs.cc", () => new NovelDownloaderSoxsParser());

class NovelDownloaderSoxsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("div.novel_list[id] dd > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("div.content[id]");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".xiaoshuo > h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".xiaoshuo > h6:nth-child(3) > a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("#intro");
        if (introDom != null) {
            let clone = introDom.cloneNode(true);
            rm("span.tags", false, clone);
            rm("q", true, clone);
            return clone.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".book_cover > img");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            rm2([
                "\u6700\u65b0\u7ae0\u8282\u5730\u5740\uff1a",
                "\u5168\u6587\u9605\u8bfb\u5730\u5740\uff1a",
                "txt\u4e0b\u8f7d\u5730\u5740\uff1a",
                "\u624b\u673a\u9605\u8bfb\uff1a",
                "\u4e3a\u4e86\u65b9\u4fbf\u4e0b\u6b21\u9605\u8bfb\uff0c\u4f60\u53ef\u4ee5\u70b9\u51fb\u4e0b\u65b9\u7684\"\u6536\u85cf\"\u8bb0\u5f55\u672c\u6b21",
                "\u8bf7\u5411\u4f60\u7684\u670b\u53cb\uff08QQ\u3001\u535a\u5ba2\u3001\u5fae\u4fe1\u7b49\u65b9\u5f0f\uff09\u63a8\u8350\u672c\u4e66",
                "\u60a8\u53ef\u4ee5\u5728\u767e\u5ea6\u91cc\u641c\u7d22"
            ], element);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }
}

function rm(selector, all, dom) {
    if (all) {
        dom.querySelectorAll(selector).forEach(e => e.remove());
    } else {
        let element = dom.querySelector(selector);
        if (element != null) {
            element.remove();
        }
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

