"use strict";

parserFactory.register("www.pixiv.net", () => new NovelDownloaderWwwPixivNetParser());

class NovelDownloaderWwwPixivNetParser extends Parser {
    constructor() {
        super();
        this.pixivMeta = null;
    }

    async getChapterUrls(dom) {
        const lang = getPixivLang();
        const version = PIXIV_VERSION;
        const path = new URL(dom.baseURI).pathname;
        if (path.startsWith("/novel/series/")) {
            const seriesId = path.split("/").pop();
            if (!seriesId) {
                return [];
            }
            const series = await getPixivSeries(seriesId, lang, version);
            this.pixivMeta = {
                title: series.bookname,
                author: series.author,
                intro: series.introduction,
                cover: series.coverURL,
                tags: series.tags
            };
            return series.chapterObjList.map((c) => ({
                sourceUrl: c.chapterUrl,
                title: c.chapterName,
                newArc: null
            }));
        }
        const novelId = new URL(dom.baseURI).searchParams.get("id");
        if (!novelId) {
            return [];
        }
        const novel = await getPixivNovel(novelId, lang, version);
        if (novel.seriesID) {
            const series = await getPixivSeries(novel.seriesID, lang, version);
            this.pixivMeta = {
                title: series.bookname,
                author: series.author,
                intro: series.introduction,
                cover: series.coverURL,
                tags: series.tags
            };
            return series.chapterObjList.map((c) => ({
                sourceUrl: c.chapterUrl,
                title: c.chapterName,
                newArc: null
            }));
        }
        this.pixivMeta = {
            title: novel.title,
            author: novel.userName,
            intro: novel.description,
            cover: novel.coverUrl,
            tags: novel.tags
        };
        return [{ sourceUrl: `https://www.pixiv.net/novel/show.php?id=${novelId}`, title: novel.title, newArc: null }];
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom) || dom.querySelector(".novel-body") || dom.querySelector("body");
    }

    extractTitleImpl(dom) {
        return this.pixivMeta?.title || dom.querySelector("h1") || null;
    }

    extractAuthor(dom) {
        if (this.pixivMeta?.author) {
            return this.pixivMeta.author.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        let authorLabel = dom.querySelector("a.user");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        if (this.pixivMeta?.intro) {
            return this.pixivMeta.intro;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return this.pixivMeta?.cover || util.getFirstImgSrc(dom, "img");
    }

    async fetchChapter(url) {
        const lang = getPixivLang();
        const version = PIXIV_VERSION;
        const id = new URL(url).searchParams.get("id");
        if (!id) {
            return (await HttpClient.wrapFetch(url)).responseXML;
        }
        const novel = await getPixivNovel(id, lang, version);
        const newDoc = Parser.makeEmptyDocForContent(url);
        let contentRaw = await buildPixivContent(novel, { id, lang, version });
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

const PIXIV_VERSION = "0e6ff4f1fa77cd8630159156c6ca02363ac6e1a8";

function getPixivLang() {
    return document.querySelector("html")?.getAttribute("lang") || "en";
}

async function pixivFetchJson(url) {
    const resp = await fetch(url, {
        credentials: "include",
        headers: { Accept: "application/json" },
        method: "GET",
        mode: "cors"
    });
    if (!resp.ok) {
        throw new Error(`Pixiv request failed: ${resp.status}`);
    }
    return resp.json();
}

async function getPixivSeries(seriesID, lang, version) {
    const url = new URL(`https://www.pixiv.net/ajax/novel/series/${seriesID}`);
    url.searchParams.append("lang", lang);
    url.searchParams.append("version", version);
    const data = await pixivFetchJson(url.href);
    const seriesTotal = data.body.total;
    const chapterObjList = [];
    const limit = 30;
    let lastOrder = 0;
    while (lastOrder < seriesTotal) {
        const url2 = new URL(`https://www.pixiv.net/ajax/novel/series_content/${seriesID}`);
        url2.searchParams.append("limit", limit.toString());
        url2.searchParams.append("last_order", lastOrder.toString());
        url2.searchParams.append("order_by", "asc");
        url2.searchParams.append("lang", lang);
        url2.searchParams.append("version", version);
        const data2 = await pixivFetchJson(url2.href);
        const seriesContents = data2.body.page.seriesContents;
        const chapterObjs = seriesContents.map((s) => {
            const id = s.id;
            return {
                chapterUrl: `https://www.pixiv.net/novel/show.php?id=${id}`,
                chapterName: s.title,
                chapterNumber: s.series.contentOrder,
                viewableType: s.series.viewableType
            };
        });
        chapterObjList.push(...chapterObjs);
        lastOrder += limit;
    }
    return {
        seriesID,
        seriesTotal,
        chapterObjList,
        bookname: data.body.title,
        author: data.body.userName,
        introduction: data.body.caption,
        coverURL: data.body.cover.urls.original,
        language: data.body.language,
        tags: data.body.tags,
        lastModified: data.body.updatedTimestamp
    };
}

async function getPixivNovel(novelID, lang, version) {
    const url = new URL(`https://www.pixiv.net/ajax/novel/${novelID}`);
    url.searchParams.append("lang", lang);
    url.searchParams.append("version", version);
    const data = await pixivFetchJson(url.href);
    return {
        title: data.body.title,
        userName: data.body.userName,
        content: data.body.content,
        description: data.body.description,
        uploadDate: data.body.uploadDate,
        coverUrl: data.body.coverUrl,
        tags: data.body.tags.tags.map((t) => t.tag),
        seriesID: data.body.seriesNavData?.seriesId?.toString() || null,
        textEmbeddedImages: data.body.textEmbeddedImages
    };
}

async function buildPixivContent(novel, options) {
    const contentRaw = document.createElement("div");
    const paragraphs = (novel.content || "").split("\n");
    contentRaw.innerHTML = paragraphs.map(p => {
        if (p.trim().length === 0) {
            return "<p><br/></p>";
        }
        return `<p>${escapeHtml(p)}</p>`;
    }).join("");
    await replacePixivImages(contentRaw, options.id, novel.textEmbeddedImages, options.lang, options.version);
    replacePixivMarks(contentRaw);
    return contentRaw;
}

async function replacePixivImages(dom, nid, textEmbeddedImages, lang, version) {
    const pixivMatches = Array.from(dom.innerHTML.matchAll(/\[pixivimage:(\d+)]/g));
    for (const match of pixivMatches) {
        const id = match[1];
        const imgSrc = await getPixivImage(nid, id, lang, version);
        if (imgSrc) {
            const img = `<a href=\"https://www.pixiv.net/artworks/${id}\"><img src=\"${imgSrc}\"/></a>`;
            dom.innerHTML = dom.innerHTML.replaceAll(match[0], img);
        }
    }
    const uploadMatches = Array.from(dom.innerHTML.matchAll(/\[uploadedimage:(\d+)]/g));
    for (const match of uploadMatches) {
        const id = match[1];
        const imgSrc = textEmbeddedImages?.[id]?.urls?.original;
        if (imgSrc) {
            dom.innerHTML = dom.innerHTML.replaceAll(match[0], `<img src=\"${imgSrc}\"/>`);
        }
    }
}

async function getPixivImage(nid, id, lang, version) {
    const url = new URL(`https://www.pixiv.net/ajax/novel/${nid}/insert_illusts`);
    url.searchParams.append("id[]", `${id}-1`);
    url.searchParams.append("lang", lang);
    url.searchParams.append("version", version);
    const data = await pixivFetchJson(url.href);
    return data?.body?.[`${id}-1`]?.illust?.images?.original || null;
}

function replacePixivMarks(dom) {
    const chapterMatches = Array.from(dom.innerHTML.matchAll(/\[chapter:(.*?)]/g));
    for (const match of chapterMatches) {
        const strong = `<strong>${escapeHtml(match[1].trim())}</strong>`;
        dom.innerHTML = dom.innerHTML.replace(match[0], strong);
    }
    const newpageMatches = Array.from(dom.innerHTML.matchAll(/\[newpage]/g));
    let page = 1;
    for (const match of newpageMatches) {
        page += 1;
        dom.innerHTML = dom.innerHTML.replace(match[0], `<hr/><a id=\"page${page}\" data-keep=\"id\" href=\"#\"></a>`);
    }
    const jumpMatches = Array.from(dom.innerHTML.matchAll(/\[jump:(\d+)]/g));
    for (const match of jumpMatches) {
        const a = `<a href=\"#page${match[1]}\">To page ${match[1]}</a>`;
        dom.innerHTML = dom.innerHTML.replace(match[0], a);
    }
    const jumpuriMatches = Array.from(dom.innerHTML.matchAll(/\[\[jumpuri:(.*?) (>|&gt;) (.*?)]]/gm));
    for (const match of jumpuriMatches) {
        const text = match[1].trim();
        const href = match[3].trim();
        dom.innerHTML = dom.innerHTML.replace(match[0], `<a href=\"${href}\">${escapeHtml(text)}</a>`);
    }
    const rbMatches = Array.from(dom.innerHTML.matchAll(/\[\[rb:(.*?) (>|&gt;) (.*?)]]/g));
    for (const match of rbMatches) {
        const rb = match[1].trim();
        const rt = match[3].trim();
        const ruby = `<ruby><rb>${escapeHtml(rb)}</rb><rp>(</rp><rt>${escapeHtml(rt)}</rt><rp>)</rp></ruby>`;
        dom.innerHTML = dom.innerHTML.replace(match[0], ruby);
    }
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
