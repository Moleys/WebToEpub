"use strict";

parserFactory.register("youdubook.com", () => new NovelDownloaderYoudubookComParser());

class NovelDownloaderYoudubookComParser extends Parser {
    constructor() {
        super();
        this.bookInfo = null;
    }

    async getChapterUrls(dom) {
        const bookId = dom.baseURI.split("/").pop();
        if (!bookId) {
            return [];
        }
        const apiBase = "https://pre-api.youdubook.com";
        const ossBase = "https://oss.youdubook.com";
        const token = localStorage.getItem("token") || "";
        const headers = {
            Accept: "application/json, text/plain, */*",
            Authorization: `Bearer ${token}`,
            Site: "1"
        };
        const detail = await fetchJson(`${apiBase}/api/webNovelDetail?novel_id=${bookId}`, headers);
        if (detail?.data) {
            this.bookInfo = {
                title: detail.data.novel_name,
                author: detail.data.novel_author,
                intro: detail.data.novel_info,
                cover: `${ossBase}${detail.data.novel_cover}`,
                tags: detail.data.novel_tags
            };
        }
        const directory = await fetchJson(`${apiBase}/api/directoryList?nid=${bookId}&orderBy=0`, headers);
        if (!directory || directory.code !== 200) {
            return [];
        }
        const volumes = directory.data.volume.reduce((obj, vol) => {
            obj[vol.volume_id] = vol.volume_name;
            return obj;
        }, {});
        let chapters = [];
        let currentArc = null;
        for (const c of directory.data.data) {
            const sectionName = volumes[c.chapter_vid] || null;
            let newArc = null;
            if (sectionName && sectionName !== currentArc) {
                currentArc = sectionName;
                newArc = sectionName;
            }
            const chapterUrl = `${apiBase}/api/readNovelByWeb?nid=${c.chapter_nid}&vid=${c.chapter_vid}&chapter_id=${c.chapter_id}&chapter_order=${c.chapter_order}&showpic=false`;
            chapters.push({ sourceUrl: chapterUrl, title: c.chapter_name, newArc });
        }
        return chapters;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom) || dom.body;
    }

    extractTitleImpl(dom) {
        return this.bookInfo?.title || dom.querySelector("h1") || null;
    }

    extractAuthor(dom) {
        if (this.bookInfo?.author) {
            return this.bookInfo.author.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        if (this.bookInfo?.intro) {
            return this.bookInfo.intro;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return this.bookInfo?.cover || util.getFirstImgSrc(dom, "img");
    }

    async fetchChapter(url) {
        const data = await fetchJson(url, {
            Accept: "application/json, text/plain, */*",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            Site: "1"
        });
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

async function fetchJson(url, headers) {
    const response = await fetch(url, {
        method: "GET",
        headers: headers || {},
        credentials: "include"
    });
    if (!response.ok) {
        return null;
    }
    return response.json();
}
