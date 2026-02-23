"use strict";

parserFactory.register("www.iqingguo.com", () => new NovelDownloaderWwwIqingguoComParser());

class NovelDownloaderWwwIqingguoComParser extends Parser {
    constructor() {
        super();
        this.bookMeta = null;
    }

    async getChapterUrls(dom) {
        let bookId = this.extractBookId(dom.baseURI);
        if (!bookId) {
            return [];
        }
        let bookData = (await iqingguoGet(`/v1/books/${bookId}/cover`))?.cover;
        let catalogData = await iqingguoGet(`/v1/books/${bookId}/catalog`);
        if (bookData) {
            this.bookMeta = {
                id: bookId,
                title: bookData.name,
                author: bookData.user?.author || bookData.author,
                intro: bookData.description,
                cover: bookData.url,
                tags: [bookData.genre, bookData.subGenre].filter(Boolean),
                lastModified: bookData.latestModified
            };
        }
        if (!Array.isArray(catalogData)) {
            return [];
        }
        return catalogData.map(c => ({
            sourceUrl: `https://www.iqingguo.com/book/reading?id=${bookId}&cid=${c.id}`,
            title: c.name,
            newArc: null
        }));
    }

    extractBookId(url) {
        try {
            return new URL(url).searchParams.get("id");
        } catch {
            return null;
        }
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return this.bookMeta?.title ?? dom.querySelector("h1");
    }

    extractAuthor(dom) {
        if (this.bookMeta?.author) {
            return this.bookMeta.author.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        if (this.bookMeta?.intro) {
            return this.bookMeta.intro;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return this.bookMeta?.cover ?? util.getFirstImgSrc(dom, "img");
    }

    async fetchChapter(url) {
        let chapterId = null;
        try {
            chapterId = new URL(url).searchParams.get("cid");
        } catch {
            chapterId = null;
        }
        if (!chapterId) {
            return (await HttpClient.wrapFetch(url)).responseXML;
        }
        let data = await iqingguoGet(`/v1/chapters/${chapterId}`);
        if (!data || !data.content) {
            return (await HttpClient.wrapFetch(url)).responseXML;
        }
        let newDoc = Parser.makeEmptyDocForContent(url);
        Parser.addTextToChapterContent(newDoc, data.content);
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

function iqingguoSign(path, params) {
    params = params || {};
    Object.assign(params, {
        packageName: "com.iqingoo.reader.web",
        t: Math.ceil(Date.now() / 1000)
    });

    const ordered = Object.keys(params)
        .sort()
        .reduce((obj, key) => {
            obj[key] = params[key];
            return obj;
        }, {});

    const query = new URLSearchParams(ordered).toString();
    const raw = `${path}?${query}`;
    ordered.sign = CryptoJS.MD5(decodeURI(raw)).toString(CryptoJS.enc.Hex);
    return ordered;
}

async function iqingguoGet(path, params) {
    const origin = "https://iqg-api.qingoo.cn";
    const signed = iqingguoSign(path, params);
    const url = origin + path + "?" + new URLSearchParams(signed).toString();
    const resp = await fetch(url, {
        headers: {
            accept: "application/json, text/plain, */*"
        },
        method: "GET",
        mode: "cors",
        credentials: "include"
    });
    const data = await resp.json();
    if (data.code !== 200) {
        throw new Error(`iQingguo request failed: ${url}`);
    }
    return data.data;
}

