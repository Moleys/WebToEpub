"use strict";

parserFactory.register("m.shauthor.com", () => new NovelDownloaderShauthorComParser());

class NovelDownloaderShauthorComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("div.info_chapters > ul.p2:last-of-type > li > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("#novelcontent");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.tab > p.p1");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let metaDescription = dom.querySelector('meta[property="og:description"]');
        if (metaDescription != null) {
            return metaDescription.getAttribute("content");
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.tu > img");
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
        let nextPageLink = dom.querySelector("div.page_chapter > ul > li:last-of-type > a");
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
        rm("p", true, content);
        rm2(["\u5185\u5bb9\u672a\u5b8c\uff0c\u4e0b\u4e00\u9875\u7ee7\u7eed\u9605\u8bfb", /shauthor/], content);
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
