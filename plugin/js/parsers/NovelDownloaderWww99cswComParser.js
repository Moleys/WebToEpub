"use strict";

parserFactory.register("www.99csw.com", () => new NovelDownloaderWww99cswComParser());

class NovelDownloaderWww99cswComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("dl#dir > dd > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div#book_info > h2");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div#book_info > h4 > a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector("div#book_info > div.intro");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector("div#book_info img");
        if (img) {
            let src = img.getAttribute("src") || img.src;
            return src && src.startsWith("//") ? "https:" + src : src;
        }
        return null;
    }

    async fetchChapter(url) {
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        if (this.findContent(chapterDom) != null) {
            return chapterDom;
        }
        try {
            let iframeDom = await HttpClient.fetchIframeDom(url, {
                waitForHiddenSelector: "#cload",
                scrollToBottom: true
            });
            if (this.findContent(iframeDom) != null) {
                return iframeDom;
            }
        } catch {
            // ignore and fall back to chapterDom
        }
        return chapterDom;
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            rms([/99csw\.com/], element);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom, webPage) {
        let title = dom.querySelector("h1");
        if (title != null) {
            return title;
        }
        return super.findChapterTitle(dom, webPage) ?? (webPage ? webPage.title : null);
    }
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
