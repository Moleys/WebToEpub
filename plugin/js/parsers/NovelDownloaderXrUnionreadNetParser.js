"use strict";

parserFactory.register("xr.unionread.net", () => new NovelDownloaderXrUnionreadNetParser());

class NovelDownloaderXrUnionreadNetParser extends Parser {
    constructor() {
        super();
        this.bookInfo = null;
    }

    async getChapterUrls(dom) {
        const bookId = dom.baseURI.match(/(\d+)/)?.[1];
        if (!bookId) {
            return [];
        }
        this.bookInfo = {
            title: dom.querySelector("div.novel_name span")?.textContent?.trim() || null,
            author: dom.querySelector("div.novel_author span")?.textContent?.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim() || null,
            intro: dom.querySelector("div.novel_info div.novel_text")?.textContent?.trim() || null,
            cover: util.getFirstImgSrc(dom, "img.bookcover")
        };
        const url = `https://hk-api.xrzww.com/api/directoryList?nid=${bookId}&orderBy=0`;
        const data = await fetchJson(url);
        if (!data || data.code !== 200) {
            return [];
        }
        const volumes = data.data.volume.reduce((obj, vol) => {
            obj[vol.volume_id] = vol.volume_name;
            return obj;
        }, {});
        let chapters = [];
        let currentArc = null;
        for (const c of data.data.data) {
            const sectionName = volumes[c.chapter_vid] || null;
            let newArc = null;
            if (sectionName && sectionName !== currentArc) {
                currentArc = sectionName;
                newArc = sectionName;
            }
            const chapterUrl = `https://hk-api.xrzww.com/api/readNovelByWeb?nid=${c.chapter_nid}&vid=${c.chapter_vid}&chapter_id=${c.chapter_id}&chapter_order=${c.chapter_order}&showpic=false`;
            chapters.push({
                sourceUrl: chapterUrl,
                title: c.chapter_name,
                newArc
            });
        }
        return chapters;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom) || dom.querySelector("#content") || dom.body;
    }

    extractTitleImpl(dom) {
        return this.bookInfo?.title || dom.querySelector("div.novel_name span") || null;
    }

    extractAuthor(dom) {
        if (this.bookInfo?.author) {
            return this.bookInfo.author.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        let authorLabel = dom.querySelector("div.novel_author span");
        if (authorLabel && authorLabel.textContent) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        if (this.bookInfo?.intro) {
            return this.bookInfo.intro;
        }
        let intro = dom.querySelector("div.novel_info div.novel_text");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return this.bookInfo?.cover || util.getFirstImgSrc(dom, "img.bookcover");
    }

    async fetchChapter(url) {
        const data = await fetchJson(url);
        if (!data || data.code !== 200) {
            return (await HttpClient.wrapFetch(url)).responseXML;
        }
        const content = data.data?.content || "";
        const newDoc = Parser.makeEmptyDocForContent(url);
        const contentRaw = newDoc.dom.createElement("div");
        for (const line of content.split("\n")) {
            const p = newDoc.dom.createElement("p");
            p.textContent = line.trim();
            contentRaw.appendChild(p);
        }
        newDoc.content.appendChild(contentRaw);
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

async function fetchJson(url) {
    const response = await fetch(url, { method: "GET", credentials: "include" });
    if (!response.ok) {
        return null;
    }
    return response.json();
}
