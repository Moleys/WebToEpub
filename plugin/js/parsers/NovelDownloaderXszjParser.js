"use strict";

parserFactory.register("m.xszj.org", () => new NovelDownloaderXszjParser());

class NovelDownloaderXszjParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let chapterListLink = dom.querySelector("a.chapterlist");
        if (!chapterListLink) {
            return [];
        }
        let tocDom = (await HttpClient.wrapFetch(chapterListLink.href)).responseXML;
        let indexUrls = this.getIndexUrls(tocDom);
        if (indexUrls.length === 0) {
            indexUrls = [tocDom.baseURI];
        }
        let seen = new Set();
        let chapters = [];
        for (const url of indexUrls) {
            let pageDom = (url === tocDom.baseURI)
                ? tocDom
                : (await HttpClient.wrapFetch(url)).responseXML;
            let links = this.getChapterLinks(pageDom);
            for (const link of links) {
                let chapter = util.hyperLinkToChapter(link);
                let key = util.normalizeUrlForCompare(chapter.sourceUrl);
                if (!seen.has(key)) {
                    seen.add(key);
                    chapters.push(chapter);
                }
            }
        }
        return chapters;
    }

    getIndexUrls(dom) {
        let select = dom.querySelector("#indexselect")
            || dom.querySelector("select[name='pageselect']")
            || dom.querySelector("select[name='page']");
        if (!select) {
            return [];
        }
        return [...select.querySelectorAll("option")]
            .map(option => option.getAttribute("value"))
            .filter(value => !util.isNullOrEmpty(value))
            .map(value => new URL(value, dom.baseURI).href);
    }

    getChapterLinks(dom) {
        let links = [...dom.querySelectorAll('#content_1 > a[rel="chapter"]')];
        if (links.length === 0) {
            links = [...dom.querySelectorAll('a[rel=\"chapter\"]')];
        }
        return links;
    }

    findContent(dom) {
        return dom.querySelector("#booktxt");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("#info > p > a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector("#intro");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#fmimg > img");
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
        let nextPageLink = dom.querySelector("div.bottem1 > a:last-of-type");
        if (nextPageLink != null && nextPageLink.textContent != null) {
            let text = nextPageLink.textContent.trim();
            if (text === "\u4e0b\u4e00\u9875" || text === "\u4e0b\u4e00\u9801") {
                return nextPageLink.href;
            }
        }
        return "";
    }

    shouldContinueNextPage(nextUrl) {
        return nextUrl !== "" && !nextUrl.includes("javascript");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            this.applyContentPatch(element);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    applyContentPatch(content) {
        rm("div", true, content);
        rm("script", true, content);
        rm("ins", true, content);
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

function rm(selector, deep, dom) {
    if (!dom) {
        return;
    }
    let nodes = dom.querySelectorAll(selector);
    nodes.forEach(node => {
        if (deep) {
            node.remove();
        } else if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    });
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
