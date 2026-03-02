"use strict";

parserFactory.register("realmnovel.com", () => new IReaderRealmNovelParser());

class IReaderRealmNovelParser extends Parser {
    constructor() {
        super();
        this.novelInfo = null;
        this.novelIdBySlug = new Map();
        this.baseUrl = "https://www.realmnovel.com";
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let slug = IReaderRealmNovelParser.slugFromUrl(dom.baseURI);
        if (util.isNullOrEmpty(slug)) {
            return [];
        }
        let info = await this.loadNovelInfo(slug);
        let novelId = info?._id;
        if (util.isNullOrEmpty(novelId)) {
            return [];
        }
        this.novelIdBySlug.set(slug, novelId);
        let chapters = [];
        let page = 1;
        let hasMore = true;
        while (hasMore) {
            let url = `${this.baseUrl}/api/chapters/${novelId}?page=${page}&limit=100`;
            let json = (await HttpClient.fetchJson(url)).json;
            let items = json?.chapters ?? [];
            let totalPages = json?.totalPages ?? 1;
            if (!Array.isArray(items) || items.length === 0) {
                break;
            }
            let partial = items.map(item => {
                let number = item?.number ?? 0;
                let title = item?.title ?? `Chapter ${number}`;
                return {
                    sourceUrl: `${this.baseUrl}/novel/${slug}/chapter/${number}`,
                    title: title,
                    number: number
                };
            });
            chapterUrlsUI.showTocProgress(partial);
            chapters = chapters.concat(partial);
            hasMore = page < totalPages;
            page += 1;
        }
        return chapters.sort((a, b) => (a.number || 0) - (b.number || 0));
    }

    static slugFromUrl(url) {
        let match = url.match(/\/novel\/([^/?#]+)/);
        if (match?.[1]) {
            return match[1];
        }
        let parts = new URL(url).pathname.split("/").filter(Boolean);
        return parts[parts.length - 1] ?? "";
    }

    async loadNovelInfo(slug) {
        if (this.novelInfo?.slug === slug) {
            return this.novelInfo;
        }
        let url = `${this.baseUrl}/api/novels/${slug}`;
        let json = (await HttpClient.fetchJson(url)).json;
        this.novelInfo = { slug: slug, ...json };
        return this.novelInfo;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom) || dom.body || dom.documentElement;
    }

    extractTitleImpl(dom) {
        let title = this.novelInfo?.title;
        if (!util.isNullOrEmpty(title)) {
            return title;
        }
        return super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        let author = this.novelInfo?.author ?? this.novelInfo?.authorName;
        return util.isNullOrEmpty(author) ? super.extractAuthor(dom) : author;
    }

    extractDescription() {
        return this.novelInfo?.description ?? "";
    }

    extractSubject() {
        let genres = this.novelInfo?.categories ?? [];
        return Array.isArray(genres) ? genres.join(", ") : "";
    }

    findCoverImageUrl(dom) {
        let cover = this.novelInfo?.cover;
        if (util.isNullOrEmpty(cover)) {
            return super.findCoverImageUrl(dom);
        }
        if (cover.startsWith("/")) {
            return `${this.baseUrl}${cover}`;
        }
        return cover;
    }

    async fetchChapter(url) {
        let slug = IReaderRealmNovelParser.slugFromUrl(url);
        let chapterNumber = IReaderRealmNovelParser.chapterNumberFromUrl(url);
        if (util.isNullOrEmpty(slug) || util.isNullOrEmpty(chapterNumber)) {
            return (await HttpClient.wrapFetch(url)).responseXML;
        }
        let novelId = this.novelIdBySlug.get(slug);
        if (util.isNullOrEmpty(novelId)) {
            let info = await this.loadNovelInfo(slug);
            novelId = info?._id;
            if (!util.isNullOrEmpty(novelId)) {
                this.novelIdBySlug.set(slug, novelId);
            }
        }
        if (util.isNullOrEmpty(novelId)) {
            return (await HttpClient.wrapFetch(url)).responseXML;
        }
        let apiUrl = `${this.baseUrl}/api/chapters/${novelId}/${chapterNumber}`;
        let json = (await HttpClient.fetchJson(apiUrl)).json;
        let title = json?.title ?? "";
        let content = json?.content ?? "";
        let paragraphs = IReaderRealmNovelParser.cleanParagraphs(content);
        let html = "";
        if (!util.isNullOrEmpty(title)) {
            html += `<h1>${title}</h1>`;
        }
        html += paragraphs.map(p => `<p>${p}</p>`).join("");
        let newDoc = Parser.makeEmptyDocForContent(url);
        util.parseHtmlAndInsertIntoContent(html, newDoc.content);
        return newDoc.dom;
    }

    static chapterNumberFromUrl(url) {
        let match = url.match(/\/chapter\/(\d+)/);
        return match?.[1] ?? "";
    }

    findChapterTitle(dom, webPage) {
        return super.findChapterTitle(dom, webPage) ?? (webPage ? webPage.title : null);
    }

    static cleanParagraphs(text) {
        if (util.isNullOrEmpty(text)) {
            return [];
        }
        const banned = [
            "\u0627\u0644\u0641\u0635\u0644 \u0627\u0644\u0633\u0627\u0628\u0642",
            "\u0627\u0644\u0641\u0635\u0644 \u0627\u0644\u062a\u0627\u0644\u064a",
            "\u0625\u0642\u0631\u0623 \u0641\u0642\u0637 \u0639\u0644\u0649",
            "\u0627\u0642\u0631\u0623 \u0641\u0642\u0637 \u0639\u0644\u0649",
            "read only on",
            "realmnovel"
        ];
        return text
            .replace(/\r\r\n/g, "\n")
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .split("\n")
            .map(line => line.trim())
            .filter(line => {
                if (util.isNullOrEmpty(line) || line.length <= 3) {
                    return false;
                }
                let lower = line.toLowerCase();
                return !banned.some(b => lower.includes(b.toLowerCase()));
            });
    }
}
