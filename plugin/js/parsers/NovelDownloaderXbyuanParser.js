"use strict";

parserFactory.register("www.xbyuan.com", () => new NovelDownloaderXbyuanParser());

class NovelDownloaderXbyuanParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let dls = dom.querySelectorAll("#list dl");
        let links = dls.length > 1
            ? dls[1].querySelectorAll("a")
            : dom.querySelectorAll("#list a");
        return [...links].map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("#nr_content") || dom.querySelector("#nr_content > p");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("#info h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("#info .small > span");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("#intro > p");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#fmimg img");
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
        return dom.querySelector("#nexturl")?.href ?? "";
    }

    shouldContinueNextPage(nextUrl) {
        let pathname = nextUrl.split("/").slice(-1)[0];
        return pathname.includes("_");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            this.applyContentPatch(element);
            element.innerHTML = element.innerHTML
                .replaceAll("\u300c", "\u201c")
                .replaceAll("\u300d", "\u201d");
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    applyContentPatch(content) {
        rm("a", true, content);
        rm2([
            "\u7cbe\u534e\u4e66\u9601",
            "\u6700\u65b0\u7ae0\u8282\uff01",
            "\u6700\u5feb\u66f4\u65b0\uff0c\u4e3a\u4e86\u60a8\u4e0b\u6b21\u8fd8\u80fd\u770b\u5230\u672c\u4e66\u7684\u6700\u5feb\u66f4\u65b0\uff0c\u8bf7\u52a1\u5fc5\u4fdd\u5b58\u597d\u4e66\u7b7e\uff01",
            "https://www.xbyuan.com"
        ], content);
        rms(["(\u672c\u7ae0\u672a\u5b8c\uff0c\u8bf7\u70b9\u51fb\u4e0b\u4e00\u9875\u7ee7\u7eed\u9605\u8bfb)"] , content);
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
