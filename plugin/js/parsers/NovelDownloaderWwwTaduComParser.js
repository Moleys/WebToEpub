"use strict";

parserFactory.register("www.tadu.com", () => new NovelDownloaderWwwTaduComParser());

class NovelDownloaderWwwTaduComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("div.lf.lfT > li > div > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.bookNm > a.bkNm");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.authorInfo > a.author > span");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("div.boxCenter.boxT.clearfix > div.lf.lfO > p.intro");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector("a.bookImg > img");
        if (img) {
            return img.getAttribute("data-src") || img.src;
        }
        return null;
    }

    async fetchChapter(url) {
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        let resourceUrl = chapterDom.getElementById("bookPartResourceUrl")?.getAttribute("value");
        if (!resourceUrl) {
            return chapterDom;
        }
        let root = new URL(url).origin;
        let contentUrl = new URL(resourceUrl, root);
        contentUrl.searchParams.set("callback", "callback");
        let response = await fetch(contentUrl.toString(), {
            headers: {
                accept: "*/*",
                Referer: root
            },
            method: "GET",
            credentials: "include"
        });
        let jsonpText = await response.text();
        if (!jsonpText) {
            return chapterDom;
        }
        let contentObj = null;
        try {
            let getContentObj = new Function("function callback(obj) { return obj; } return " + jsonpText + ";");
            contentObj = getContentObj();
        } catch (error) {
            ErrorLog.log(error);
            return chapterDom;
        }
        if (!contentObj || !contentObj.content) {
            return chapterDom;
        }
        let newDoc = Parser.makeEmptyDocForContent(url);
        newDoc.content.innerHTML = contentObj.content;
        return newDoc.dom;
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
    }
}

