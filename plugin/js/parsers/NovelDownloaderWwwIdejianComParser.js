"use strict";

parserFactory.register("www.idejian.com", () => new NovelDownloaderWwwIdejianComParser());

class NovelDownloaderWwwIdejianComParser extends Parser {
    constructor() {
        super();
        this.bookInfo = null;
    }

    async getChapterUrls(dom) {
        let bookId = dom.baseURI.match(/\/(\d+)\/?$/)?.[1];
        if (!bookId) {
            return [];
        }
        this.bookInfo = this.bookInfoFromDom(dom);
        let chapters = [];
        let page = 0;
        while (true) {
            page += 1;
            let html = await fetchCatalogHtml(bookId, page);
            if (!html) {
                break;
            }
            let tempDom = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
            let links = [...tempDom.querySelectorAll("li > a")];
            if (links.length === 0) {
                break;
            }
            chapters.push(...links.map(link => util.hyperLinkToChapter(link)));
        }
        return chapters;
    }

    bookInfoFromDom(dom) {
        return {
            title: dom.querySelector(".detail_bkname > a")?.textContent?.trim() || null,
            author: dom.querySelector(".detail_bkauthor")?.childNodes?.[0]?.textContent?.trim() || null,
            intro: dom.querySelector(".brief_con")?.textContent?.trim() || null,
            cover: util.getFirstImgSrc(dom, ".book_img > img")
        };
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom) || dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".detail_bkname > a") || this.bookInfo?.title || null;
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".detail_bkauthor");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return this.bookInfo?.author
            ? this.bookInfo.author.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim()
            : super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector(".brief_con");
        if (intro != null) {
            return intro.textContent.trim();
        }
        return this.bookInfo?.intro || super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".book_img > img") || this.bookInfo?.cover || null;
    }

    async fetchChapter(url) {
        let apiUrl = url.replace("https://www.idejian.com", "https://wechat.idejian.com/api/wechat").replace(/\.html$/, "");
        let response = await fetch(apiUrl, { method: "GET", credentials: "include" });
        if (!response.ok) {
            return (await HttpClient.wrapFetch(url)).responseXML;
        }
        let data = await response.json();
        let content = data?.body?.content;
        if (!content) {
            return (await HttpClient.wrapFetch(url)).responseXML;
        }
        let newDoc = Parser.makeEmptyDocForContent(url);
        util.parseHtmlAndInsertIntoContent(content, newDoc.content);
        return newDoc.dom;
    }

    findChapterTitle(dom, webPage) {
        let title = dom.querySelector("h1");
        if (title != null) {
            return title;
        }
        return super.findChapterTitle(dom, webPage) ?? (webPage ? webPage.title : null);
    }
}

async function fetchCatalogHtml(bookId, page) {
    let url = `https://www.idejian.com/catelog/${bookId}/1?page=${page}`;
    let response = await fetch(url, { method: "GET", credentials: "include" });
    if (!response.ok) {
        return null;
    }
    let data = await response.json();
    return data?.html || null;
}
