"use strict";

parserFactory.register("www.lzdzw.com", () => new NovelDownloaderWwwLzdzwComParser());

class NovelDownloaderWwwLzdzwComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let match = dom.baseURI.match(/\/(\d+)\.html/);
        if (!match) {
            return [];
        }
        let id = match[1];
        let indexUrl = `https://www.lzdzw.com/book/${id}/1/`;
        let indexDom = (await HttpClient.wrapFetch(indexUrl)).responseXML;
        let options = [...indexDom.querySelectorAll(".page-item option")];
        let indexUrls = options.length === 0
            ? [indexUrl]
            : options.map(option => "https://www.lzdzw.com/" + option.getAttribute("value"));

        let seen = new Set();
        let chapters = [];
        for (const url of indexUrls) {
            let tocDom = (await HttpClient.wrapFetch(url)).responseXML;
            let links = [...tocDom.querySelectorAll(".book_list a")];
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

    findContent(dom) {
        return dom.querySelector("#novelcontent") || Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".book_info h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".book_info div.options li a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("#intro_pc");
        if (introDom != null) {
            let clone = introDom.cloneNode(true);
            rm("strong", true, clone);
            rm2(["?????«", "»????????????QQ?????????????!"], clone);
            return clone.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "img.img-thumbnail");
    }

    async fetchChapter(url) {
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        let content = this.findContent(chapterDom);
        if (content == null) {
            try {
                let iframeDom = await HttpClient.fetchIframeDom(url, {
                    waitForSelector: "#novelcontent",
                    minTextLength: 10
                });
                if (iframeDom) {
                    chapterDom = iframeDom;
                    content = this.findContent(chapterDom);
                }
            } catch {
                // ignore iframe errors
            }
        }
        if (content != null) {
            await this.appendNextPages(chapterDom, content, url);
        }
        return chapterDom;
    }

    async appendNextPages(chapterDom, content, url) {
        let baseUrl = url.replace(/\.html$/, "");
        for (let i = 1; i < 10000; i++) {
            let nextUrl = `${baseUrl}_${i}.html`;
            let nextDom = (await HttpClient.wrapFetch(nextUrl)).responseXML;
            if (nextDom.title && nextDom.title.includes("?1?")) {
                break;
            }
            let nextContent = this.findContent(nextDom);
            if (nextContent != null) {
                for (const p of Array.from(nextContent.querySelectorAll("p"))) {
                    content.appendChild(chapterDom.importNode(p, true));
                    content.appendChild(chapterDom.createElement("br"));
                }
            }
        }
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            rm2(["????????????????,????????????????????"], element);
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

