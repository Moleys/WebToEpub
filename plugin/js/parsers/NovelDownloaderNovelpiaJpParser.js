"use strict";

parserFactory.register("novelpia.jp", () => new NovelDownloaderNovelpiaJpParser());

class NovelDownloaderNovelpiaJpParser extends Parser {
    constructor() {
        super();
        this.bookInfo = null;
        this.chapterIdByUrl = new Map();
    }

    async getChapterUrls(dom) {
        const bookUrl = dom.baseURI;
        const bookId = bookUrl.match(/novel\/(\d+)/)?.[1];
        if (!bookId) {
            return [];
        }
        const timestamp = Date.now();
        const novelInfoUrl = `https://novelpia.jp/proc/novel?cmd=get_novel&novel_no=${bookId}&mem_nick=HATI&_=${timestamp}`;
        const novelInfo = await fetchJson(novelInfoUrl, { credentials: "include" });
        if (novelInfo?.novel) {
            this.bookInfo = {
                title: novelInfo.novel.novel_name,
                author: novelInfo.novel.writer_nick,
                intro: novelInfo.novel.novel_story,
                cover: "https:" + novelInfo.novel.cover_img,
                tags: novelInfo.novel.novel_genre_arr
            };
        }
        const totalPages = Math.ceil((novelInfo?.novel?.count_book || 0) / 20);
        let chapters = [];
        for (let i = 0; i < totalPages; i++) {
            const body = `novel_no=${bookId}&page=${i}`;
            const response = await fetch("https://novelpia.jp/proc/episode_list", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
                body,
                credentials: "include"
            });
            if (!response.ok) {
                continue;
            }
            const text = await response.text();
            const tempDom = new DOMParser().parseFromString(text, "text/html");
            tempDom.querySelectorAll("td.ep_style3").forEach(e => e.remove());
            const chapterList = tempDom.querySelectorAll("tr > td > b");
            for (const ep of Array.from(chapterList)) {
                const chapterId = ep.querySelector("i")?.getAttribute("id")?.match(/(\d+)/)?.[1];
                if (!chapterId) {
                    continue;
                }
                const chapterUrl = `https://novelpia.jp/viewer/${chapterId}`;
                const epClone = ep.cloneNode(true);
                epClone.querySelectorAll?.("span").forEach(s => s.remove());
                const chapterName = epClone.textContent?.trim() || chapterUrl;
                chapters.push({ sourceUrl: chapterUrl, title: chapterName, newArc: null });
                this.chapterIdByUrl.set(chapterUrl, chapterId);
            }
        }
        return chapters;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom) || dom.querySelector("#content") || dom.body;
    }

    extractTitleImpl(dom) {
        return this.bookInfo?.title || dom.querySelector("h1") || null;
    }

    extractAuthor(dom) {
        if (this.bookInfo?.author) {
            return this.bookInfo.author.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        let authorLabel = dom.querySelector(".writer");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        if (this.bookInfo?.intro) {
            const introDom = document.createElement("div");
            introDom.innerHTML = this.bookInfo.intro;
            return introDom.textContent?.trim() || this.bookInfo.intro;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return this.bookInfo?.cover || util.getFirstImgSrc(dom, "img");
    }

    async fetchChapter(url) {
        const chapterId = this.chapterIdByUrl.get(url) || url.match(/viewer\/(\d+)/)?.[1];
        if (!chapterId) {
            return (await HttpClient.wrapFetch(url)).responseXML;
        }
        const apiUrl = `https://novelpia.jp/proc/viewer_data/${chapterId}`;
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                Accept: "application/json, text/javascript, */*; q=0.01",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            body: "size=14",
            credentials: "include"
        });
        if (!response.ok) {
            return (await HttpClient.wrapFetch(url)).responseXML;
        }
        const data = await response.json();
        const newDoc = Parser.makeEmptyDocForContent(url);
        const contentRaw = newDoc.dom.createElement("div");
        for (const s of data?.s || []) {
            const p = newDoc.dom.createElement("p");
            p.innerHTML = s.text;
            contentRaw.appendChild(p);
            contentRaw.appendChild(newDoc.dom.createElement("br"));
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

async function fetchJson(url, init) {
    const response = await fetch(url, init);
    if (!response.ok) {
        return null;
    }
    return response.json();
}
