"use strict";

parserFactory.register("wenku8.net", () => new Wenku8Parser());

class Wenku8Parser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let id = Wenku8Parser.extractBookId(dom);
        if (util.isNullOrEmpty(id)) {
            return [];
        }

        let bookUrl = `https://www.wenku8.net/book/${id}.htm`;
        let bookDom = dom;
        if (!dom.baseURI.includes(`/book/${id}.htm`)) {
            bookDom = (await HttpClient.wrapFetch(bookUrl)).responseXML;
        }

        let catalogUrl = bookDom.querySelector("legend + div > a")?.href ?? "";
        if (!util.isNullOrEmpty(catalogUrl)) {
            catalogUrl = new URL(catalogUrl, bookDom.baseURI).href;
            let tocDom = (await HttpClient.wrapFetch(catalogUrl)).responseXML;
            return Wenku8Parser.extractChapterUrlsFromCatalog(tocDom, catalogUrl);
        }

        let tocUrl = `https://www.wenku8.net/modules/article/reader.php?aid=${id}`;
        let xhr = await HttpClient.wrapFetch(tocUrl);
        let menu = xhr.responseXML.querySelector("table");
        return util.hyperlinksToChapterList(menu);
    }

    static extractBookId(dom) {
        let url = dom.baseURI || "";
        let match = url.match(/wenku8\.net\/book\/(\d+)/);
        if (match && match[1]) {
            return match[1];
        }
        match = url.match(/wenku8\.net\/novel\/\d+\/(\d+)\//);
        if (match && match[1]) {
            return match[1];
        }
        let path = new URL(url).pathname.split("/");
        return path[path.length - 1].split(".")[0];
    }

    static extractChapterUrlsFromCatalog(tocDom, catalogUrl) {
        let tdList = tocDom.querySelectorAll("table td");
        let chapters = [];
        let currentArc = null;
        let volumeStartIndex = null;
        let isFirstInVolume = false;
        let base = new URL("./", catalogUrl).href;

        for (const td of Array.from(tdList)) {
            let styleClass = td.getAttribute("class");
            if (styleClass === "vcss") {
                currentArc = td.textContent?.trim() || "";
                volumeStartIndex = chapters.length;
                isFirstInVolume = true;
            } else if (styleClass === "ccss") {
                let link = td.querySelector("a");
                if (!link) {
                    continue;
                }
                let href = link.getAttribute("href");
                if (util.isNullOrEmpty(href)) {
                    continue;
                }
                let title = link.textContent?.trim() || link.title || href;
                let chapter = {
                    sourceUrl: new URL(href, base).href,
                    title: title,
                    newArc: isFirstInVolume ? currentArc : null
                };
                if (title === "插图" && volumeStartIndex != null) {
                    if (chapters[volumeStartIndex]?.newArc) {
                        chapters[volumeStartIndex].newArc = null;
                    }
                    chapter.newArc = currentArc;
                    chapters.splice(volumeStartIndex, 0, chapter);
                    volumeStartIndex += 1;
                } else {
                    chapters.push(chapter);
                }
                isFirstInVolume = false;
            }
        }
        return chapters;
    }

    findContent(dom) {
        return dom.querySelector("#content") || dom.querySelector("#contentmain");
    }

    extractTitleImpl(dom) {
        let title = dom.querySelector("#content table:nth-child(1) span b")
            || dom.querySelector("tbody td b");
        return title?.textContent ?? "";
    }

    extractLanguage() {
        return "zh";
    }

    extractAuthor(dom) {
        let details = dom.querySelector("#content table:nth-child(1) tr:nth-child(2)")?.querySelectorAll("td");
        let author = details && details.length > 1 ? details[1].textContent : null;
        if (!util.isNullOrEmpty(author)) {
            return author.replace(/\u5c0f\u8bf4\u4f5c\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let tables = dom.querySelectorAll("#content table");
        if (tables.length > 2) {
            let tdList = tables[2].querySelectorAll("td");
            if (tdList.length > 1) {
                let td = tdList[1];
                let spans = td.querySelectorAll("span");
                if (spans.length > 0) {
                    let desc = spans[spans.length - 1].textContent;
                    if (!util.isNullOrEmpty(desc)) {
                        return desc.trim();
                    }
                }
            }
        }
        return super.extractDescription(dom);
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "#contentdp");
        util.removeChildElementsMatchingSelector(element, "br");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#content table img")
            || util.getFirstImgSrc(dom, "div#content");
    }

    fetchChapter(url) {
        return HttpClient.wrapFetch(url).then(function(xhr) {
            return Promise.resolve(xhr.responseXML);
        });
    }
}
