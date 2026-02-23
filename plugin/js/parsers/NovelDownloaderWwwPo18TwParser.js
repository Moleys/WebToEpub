"use strict";

parserFactory.register("www.po18.tw", () => new NovelDownloaderWwwPo18TwParser());

class NovelDownloaderWwwPo18TwParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 500;
    }

    async getChapterUrls(dom) {
        let bookId = this.extractBookId(dom.baseURI);
        if (!bookId) {
            return [];
        }
        let listUrl = `https://www.po18.tw/books/${bookId}/articles`;
        let listDom = (await HttpClient.wrapFetch(listUrl)).responseXML;
        let pageLinks = [...listDom.querySelectorAll("div.pagenum a")] 
            .map(a => a.href);
        if (pageLinks.length === 0) {
            pageLinks = [listUrl];
        }
        let chapters = [];
        let chapterNumber = 0;
        for (const url of new Set(pageLinks)) {
            await util.sleep(this.minimumThrottle);
            let pageDom = (await HttpClient.wrapFetch(url)).responseXML;
            let items = [...pageDom.querySelectorAll("div.list-view div.c_l")];
            for (const item of items) {
                let nameElem = item.querySelector("div.l_chaptname");
                let link = nameElem?.querySelector("a");
                if (!link || !link.href) {
                    continue;
                }
                chapterNumber++;
                let chapter = util.hyperLinkToChapter(link);
                if (util.isNullOrEmpty(chapter.title) && nameElem) {
                    chapter.title = nameElem.textContent?.trim() || chapter.title;
                }
                chapters.push(chapter);
            }
        }
        return chapters;
    }

    extractBookId(url) {
        let match = url.match(/books\/(\d+)/);
        return match ? match[1] : null;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.book_name");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("a.book_author");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("div.B_I_content");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book_cover > img");
    }

    async fetchChapter(url) {
        let contentUrl = url.replace("articles", "articlescontent");
        let response = await fetch(contentUrl, {
            credentials: "include",
            headers: {
                Accept: "text/html, */*; q=0.01",
                "X-Requested-With": "XMLHttpRequest",
                Referer: url
            }
        });
        let text = await response.text();
        let newDoc = Parser.makeEmptyDocForContent(url);
        newDoc.content.innerHTML = text.replaceAll("<p>\n", "");
        rm("blockquote", true, newDoc.content);
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

