"use strict";

parserFactory.register("www.myrics.com", () => new NovelDownloaderWwwMyricsComParser());

class NovelDownloaderWwwMyricsComParser extends Parser {
    constructor() {
        super();
        this.bookInfo = null;
    }

    async getChapterUrls(dom) {
        const bookId = dom.baseURI.split("/").pop();
        const csrfToken = dom.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
        if (!bookId || !csrfToken) {
            return [];
        }
        const headers = {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
        };
        const novelDetail = await fetchJson(`https://www.myrics.com/authors/api_novel_detailed/${bookId}`, {
            method: "POST",
            headers,
            body: "null",
            credentials: "include"
        });
        const authorDetail = await fetchJson(`https://www.myrics.com/novels/api_author_detailed/${bookId}`, {
            method: "POST",
            headers: { Accept: "application/json", "X-CSRFToken": csrfToken },
            credentials: "include"
        });
        if (novelDetail?.isSuccess) {
            this.bookInfo = {
                title: novelDetail.data?.title || null,
                author: authorDetail?.data?.pen_name || null,
                intro: novelDetail.data?.long_summary || null,
                cover: novelDetail.data?.image || null
            };
        }
        const menuUrl = "https://www.myrics.com/novels/menu";
        let firstMenu = await fetchJson(menuUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({ page_limit: 12, id: bookId, sort: "asc", page: 1 }),
            credentials: "include"
        });
        if (!firstMenu?.isSuccess) {
            return [];
        }
        const totalPages = firstMenu.data?.total_page || 1;
        let allMenus = [firstMenu.data];
        for (let page = 2; page <= totalPages; page++) {
            let menu = await fetchJson(menuUrl, {
                method: "POST",
                headers,
                body: JSON.stringify({ page_limit: 12, id: bookId, sort: "asc", page }),
                credentials: "include"
            });
            if (menu?.isSuccess) {
                allMenus.push(menu.data);
            }
        }
        let chapters = [];
        let currentArc = null;
        for (const menu of allMenus) {
            for (const item of menu.list || []) {
                const arcName = `?${item.part}`;
                let newArc = null;
                if (arcName !== currentArc) {
                    currentArc = arcName;
                    newArc = arcName;
                }
                const chapterUrl = `https://www.myrics.com/chapters/${item.id}`;
                const chapterName = `${item.sort}. ${item.title}`;
                chapters.push({ sourceUrl: chapterUrl, title: chapterName, newArc });
            }
        }
        return chapters;
    }

    findContent(dom) {
        return dom.querySelector(".container > .wysiwyg");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".container > h1") || this.bookInfo?.title || null;
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".author-name, .author a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return this.bookInfo?.author
            ? this.bookInfo.author.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim()
            : super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector(".novel-intro, .book-intro");
        if (intro != null) {
            return intro.textContent.trim();
        }
        return this.bookInfo?.intro || super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".novel-cover img") || this.bookInfo?.cover || null;
    }

    findChapterTitle(dom, webPage) {
        let title = dom.querySelector(".container > h1");
        if (title != null) {
            return title;
        }
        return super.findChapterTitle(dom, webPage) ?? (webPage ? webPage.title : null);
    }
}

async function fetchJson(url, init) {
    const response = await fetch(url, init);
    if (!response.ok) {
        return null;
    }
    return response.json();
}
