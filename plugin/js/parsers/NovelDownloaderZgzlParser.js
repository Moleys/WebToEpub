"use strict";

parserFactory.register("www.zgzl.net", () => new NovelDownloaderZgzlParser());

class NovelDownloaderZgzlParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let sectionHeaders = dom.querySelectorAll("#list > dl > dt > b");
        if (sectionHeaders.length > 0) {
            let secondDt = dom.querySelector("#list > dl > dt:nth-of-type(2)");
            if (secondDt != null) {
                let chapters = [];
                let current = secondDt.nextElementSibling;
                while (current != null && current.tagName.toLowerCase() === "dd") {
                    let anchor = current.querySelector("a");
                    if (anchor != null) {
                        chapters.push(util.hyperLinkToChapter(anchor));
                    }
                    current = current.nextElementSibling;
                }
                return chapters;
            }
        }
        return [...dom.querySelectorAll("#list > dl > dd > a")].map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("#info > h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("#info > p:first-of-type");
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
        let nextLink = dom.querySelector("div.bottem1 > a:last-of-type");
        if (nextLink == null || nextLink.href == null) {
            return "";
        }
        let url = dom.baseURI;
        let urlParts = url.split("/");
        let lastPart = urlParts[urlParts.length - 1];
        let chapterId = lastPart.split(".")[0].split("_")[0];
        if (nextLink.href.includes(chapterId)) {
            return nextLink.href;
        }
        return "";
    }

    shouldContinueNextPage(nextUrl) {
        return nextUrl !== "" && !nextUrl.includes("info_");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            this.applyContentPatch(element);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    applyContentPatch(content) {
        let converted = convertBr(content);
        if (converted.children.length > 1) {
            let lastLine = converted.lastElementChild?.textContent ?? "";
            let unwantedText = /\u5185\u5bb9\u672a\u5b8c.*|\u672c\u7ae0\u9605\u8bfb\u5b8c\u6bd5.*/;
            if (unwantedText.test(lastLine)) {
                converted.removeChild(converted.lastElementChild);
            }
        }
        content.innerHTML = "";
        for (const child of Array.from(converted.childNodes)) {
            content.appendChild(child);
        }
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

function convertBr(node) {
    let html = node.innerHTML.replace(/<br\s*\/?>/gi, "\n");
    let lines = html.split(/\n+/);
    let container = node.ownerDocument.createElement("div");
    for (const line of lines) {
        let text = line.trim();
        if (text === "") {
            continue;
        }
        let p = node.ownerDocument.createElement("p");
        p.innerHTML = text;
        container.appendChild(p);
    }
    return container;
}
