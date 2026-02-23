"use strict";

parserFactory.register("www.69hsz.net", () => new NovelDownloader69hszParser());

class NovelDownloader69hszParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("#list > dl > dt:last-of-type ~ a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("#booktxt");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("#info h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("#info > p");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("#intro");
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
        let nextPageLink = dom.querySelector("div.bottem1 > a[rel=next]");
        if (nextPageLink != null && nextPageLink.textContent != null && nextPageLink.textContent.includes("\u4e0b\u4e00\u9875")) {
            return nextPageLink.href;
        }
        return "";
    }

    shouldContinueNextPage(nextUrl) {
        return /_\d\.html/.test(nextUrl);
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            this.applyContentPatch(element);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    applyContentPatch(content) {
        rm2([/\u672c\u7ae0\u9605\u8bfb\u5b8c\u6bd5/], content);
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

