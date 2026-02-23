"use strict";

parserFactory.register("www.wanbengo.com", () => new NovelDownloaderWanbengoParser());

class NovelDownloaderWanbengoParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll(".chapter li > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("div.readerCon");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".detailTitle > h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".writer > a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector(".detailTopMid > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(2)");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".detailTopLeft > img");
    }

    async fetchChapter(url) {
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        await this.appendNextPages(chapterDom);
        return chapterDom;
    }

    async appendNextPages(chapterDom) {
        let content = this.findContent(chapterDom);
        if (content == null) {
            return;
        }
        this.applyContentPatch(content);
        let nextUrl = this.getNextPageUrl(chapterDom);
        while (nextUrl != null && nextUrl !== "" && this.shouldContinueNextPage(nextUrl)) {
            let nextDom = (await HttpClient.wrapFetch(nextUrl)).responseXML;
            let nextContent = this.findContent(nextDom);
            if (nextContent != null) {
                this.applyContentPatch(nextContent);
                content.appendChild(chapterDom.createElement("hr"));
                for (const child of Array.from(nextContent.childNodes)) {
                    content.appendChild(chapterDom.importNode(child, true));
                }
            }
            nextUrl = this.getNextPageUrl(nextDom);
        }
    }

    getNextPageUrl(dom) {
        return dom.querySelector(".readPage > a:nth-child(3)")?.href ?? "";
    }

    shouldContinueNextPage(nextUrl) {
        let pathname = nextUrl.split("/").slice(-1)[0];
        return pathname.includes("_");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            this.applyContentPatch(element);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    applyContentPatch(content) {
        rm("script", true, content);
        rm("div[style]", true, content);
        rm("a", true, content);
        rm2([
            "\u3010\u63d0\u793a\u3011\uff1a\u5982\u679c\u89c9\u5f97\u6b64\u6587\u4e0d\u9519\uff0c\u8bf7\u63a8\u8350\u7ed9\u66f4\u591a\u5c0f\u4f19\u4f34\u5427\uff01\u5206\u4eab\u4e5f\u662f\u4e00\u79cd\u4eab\u53d7\u3002",
            "\u3010\u770b\u4e66\u52a9\u624b\u3011",
            "\u767e\u4e07\u70ed\u95e8\u4e66\u7c4d\u7ec8\u8eab\u65e0\u5e7f\u544a\u514d\u8d39\u9605\u8bfb",
            "\u3010\u5b8c\u672c\u795e\u7ad9\u3011",
            "\u4e00\u79d2\u8bb0\u4f4f\u3001\u6c38\u4e0d\u4e22\u5931\uff01"
        ], content);
        htmlTrim(content);
        return content;
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
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

function htmlTrim(dom) {
    let nodes = Array.from(dom.childNodes);
    trimNodes(nodes);
    let reversed = Array.from(dom.childNodes).reverse();
    trimNodes(reversed);

    function trimNodes(list) {
        for (const node of list) {
            if (node.nodeType === Node.TEXT_NODE) {
                if ((node.textContent || "").trim() === "") {
                    node.remove();
                    continue;
                } else {
                    break;
                }
            }
            if (node.nodeName === "BR") {
                node.remove();
                continue;
            }
            if (node.nodeName === "P" && (node.textContent || "").trim() === "") {
                node.remove();
                continue;
            }
            if (node.nodeType === Node.ELEMENT_NODE) {
                break;
            }
        }
    }
}
