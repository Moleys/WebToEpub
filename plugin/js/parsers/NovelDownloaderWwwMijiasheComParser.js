"use strict";

parserFactory.register("www.mijiashe.com", () => new NovelDownloaderWwwMijiasheComParser());

class NovelDownloaderWwwMijiasheComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("#list") || dom.querySelector(".listmain") || dom.querySelector(".book-item");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("#info h1, .info h2, .info h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("#info > p:nth-child(2), #info > div:nth-child(2), .info .author, .small > span:nth-child(1), .info .fix > p:nth-child(1)");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#fmimg > img, .info > .cover > img, .book-boxs > .img > img, .imgbox > img");
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
        let nextUrl = this.getNextPageUrl(chapterDom);
        while (nextUrl != null && nextUrl !== "" && this.shouldContinueNextPage(nextUrl)) {
            let nextDom = (await HttpClient.wrapFetch(nextUrl)).responseXML;
            let nextContent = this.findContent(nextDom);
            if (nextContent != null) {
                content.appendChild(chapterDom.createElement("hr"));
                for (const child of Array.from(nextContent.childNodes)) {
                    content.appendChild(chapterDom.importNode(child, true));
                }
            }
            nextUrl = this.getNextPageUrl(nextDom);
        }
    }

    getNextPageUrl(dom) {
        return dom.querySelector("#next_url")?.href || "";
    }

    shouldContinueNextPage(nextUrl) {
        return new URL(nextUrl).pathname.includes("_");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            this.applyIntroPatch(element.ownerDocument);
            this.applyContentPatch(element);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    applyIntroPatch(dom) {
        let introDom = dom.querySelector("#intro, .intro, .book-intro, .desc");
        if (introDom == null) {
            return;
        }
        let match = introDom.innerHTML.match(/\u300a(.*)\u300b/);
        let bookname = (match && match.length === 2) ? match[1] : null;
        rm2([
            "\u8fd8\u4e0d\u9519\u7684\u8bdd\u8bf7\u4e0d\u8981\u5fd8\u8bb0\u5411\u60a8QQ\u7fa4\u548c\u5fae\u535a\u91cc\u7684\u670b\u53cb\u63a8\u8350\u54e6\uff01",
            "\u5c0f\u8bf4\u514d\u8d39\u9605\u8bfb\u5730\u5740\uff1a"
        ], introDom);
        if (bookname != null) {
            rms([bookname + "\u5c0f\u8bf4\u7b80\u4ecb\uff1a"], introDom);
        }
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
    }

    applyContentPatch(content) {
        rm2([
            "\u8c28\u8bb0\u6211\u4eec\u7684\u7f51\u5740\uff0c\u795d\u5927\u5bb6\u9605\u8bfb\u6109\u5feb\uff01\u522b\u5fd8\u4e86\u591a\u591a\u5ba3\u4f20\u5ba3\u4f20\u3002",
            "\u3010\u63d0\u793a\u3011\uff1a\u5982\u679c\u89c9\u5f97\u6b64\u6587\u4e0d\u9519\uff0c\u8bf7\u63a8\u8350\u7ed9\u66f4\u591a\u5c0f\u4f19\u4f34\u5427\uff01\u5206\u4eab\u4e5f\u662f\u4e00\u79cd\u4eab\u53d7\u3002"
        ], content);
        htmlTrim(content);
        return content;
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

