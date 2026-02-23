"use strict";

parserFactory.register("read.zongheng.com", () => new NovelDownloaderReadZonghengComParser());

class NovelDownloaderReadZonghengComParser extends Parser {
    constructor() {
        super();
        this.bookInfo = null;
    }

    async getChapterUrls(dom) {
        const bookId = extractZonghengBookId(dom.baseURI);
        if (!bookId) {
            return [];
        }
        const bookUrl = `https://www.zongheng.com/detail/${bookId}`;
        try {
            let bookDom = (await HttpClient.wrapFetch(bookUrl)).responseXML;
            this.bookInfo = this.bookInfoFromDom(bookDom);
        } catch (e) {
            this.bookInfo = null;
        }
        const data = await fetchZonghengChapterList(bookId);
        if (!data || !data.result || !Array.isArray(data.result.chapterList)) {
            return [];
        }
        let chapters = [];
        for (const tome of data.result.chapterList) {
            let newArc = tome.tome?.tomeName || null;
            for (const chapterView of tome.chapterViewList || []) {
                const chapterUrl = `https://read.zongheng.com/chapter/${bookId}/${chapterView.chapterId}.html`;
                chapters.push({
                    sourceUrl: chapterUrl,
                    title: chapterView.chapterName,
                    newArc: newArc
                });
                newArc = null;
            }
        }
        return chapters;
    }

    bookInfoFromDom(dom) {
        return {
            title: dom.querySelector(".book-info--title > span")?.textContent?.trim() || null,
            author: dom.querySelector("a.author-info--name")?.textContent?.trim() || null,
            intro: dom.querySelector("section.detail-work-info--introduction")?.textContent?.trim() || null,
            cover: util.getFirstImgSrc(dom, "img.book-info--coverImage-img")
        };
    }

    findContent(dom) {
        return dom.querySelector("div.content, div.eccontent");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".book-info--title > span") || this.bookInfo?.title || null;
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("a.author-info--name");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return this.bookInfo?.author
            ? this.bookInfo.author.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim()
            : super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector("section.detail-work-info--introduction");
        if (intro != null) {
            return intro.textContent.trim();
        }
        return this.bookInfo?.intro || super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "img.book-info--coverImage-img") || this.bookInfo?.cover || null;
    }

    async fetchChapter(url) {
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        let content = this.findContent(chapterDom);
        if (content != null && (content.textContent?.length || 0) >= 10) {
            return chapterDom;
        }
        try {
            let iframeDom = await HttpClient.fetchIframeDom(url, {
                waitForSelector: "div.eccontent",
                minTextLength: 10
            });
            if (this.findContent(iframeDom) != null) {
                return iframeDom;
            }
        } catch {
            // ignore and fall back to chapterDom
        }
        return chapterDom;
    }

    findChapterTitle(dom, webPage) {
        let title = dom.querySelector("h1");
        if (title != null) {
            return title;
        }
        return super.findChapterTitle(dom, webPage) ?? (webPage ? webPage.title : null);
    }
}

async function fetchZonghengChapterList(bookId) {
    const url = "https://bookapi.zongheng.com/api/chapter/getChapterList";
    const formData = new URLSearchParams();
    formData.append("bookId", bookId);
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest"
        },
        body: formData.toString(),
        credentials: "include"
    });
    if (!response.ok) {
        return null;
    }
    return response.json();
}

function extractZonghengBookId(url) {
    let match = url.match(/chapter\/(\d+)/);
    if (match) {
        return match[1];
    }
    match = url.match(/detail\/(\d+)/);
    if (match) {
        return match[1];
    }
    match = url.match(/book\/(\d+)/);
    return match ? match[1] : null;
}
