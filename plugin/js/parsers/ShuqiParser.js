"use strict";

parserFactory.register("t.shuqi.com", () => new ShuqiParser());
parserFactory.register("www.shuqi.com", () => new ShuqiParser());

class ShuqiParser extends Parser {
    constructor() {
        super();
        this.bookDom = null;
        this.bookUrl = null;
        this.bookInfo = {
            title: "",
            author: "",
            cover: ""
        };
        this.tocJson = null;
    }

    async loadEpubMetaInfo(dom) {
        let bookDom = await this.ensureBookDom(dom);
        await this.ensureBookInfoFromApi(bookDom);
        return super.loadEpubMetaInfo(bookDom || dom);
    }

    populateUI(dom) {
        let useDom = this.bookDom || dom;
        return super.populateUI(useDom);
    }

    async onLoadFirstPage(url, firstPageDom) {
        let normalizedUrl = ShuqiParser.normalizeBookUrl(url);
        if (normalizedUrl !== url) {
            let dom = (await HttpClient.wrapFetch(normalizedUrl)).responseXML;
            return super.onLoadFirstPage(normalizedUrl, dom);
        }
        return super.onLoadFirstPage(url, firstPageDom);
    }

    async addParsersToPages(pagesToFetch) {
        // Chapter URLs use different hosts; always use this parser
        for (let page of pagesToFetch) {
            page.parser = this;
        }
    }

    async getChapterUrls(dom) {
        let normalizedUrl = ShuqiParser.normalizeBookUrl(dom?.baseURI);
        if (normalizedUrl && normalizedUrl !== dom?.baseURI) {
            try {
                let normalizedDom = (await HttpClient.wrapFetch(normalizedUrl)).responseXML;
                dom = normalizedDom;
                this.state.chapterListUrl = normalizedUrl;
                this.state.firstPageDom = normalizedDom;
                this.bookDom = normalizedDom;
                this.bookUrl = normalizedUrl;
            } catch (error) {
                console.log("[ShuqiParser] normalize fetch failed", error);
            }
        }

        await this.ensureBookInfoFromApi(dom);
        let json = this.tocJson;
        if (json == null) {
            let bookId = ShuqiParser.extractBookId(dom?.baseURI);
            if (util.isNullOrEmpty(bookId)) {
                return [];
            }
            let tocUrl = this.makeTocUrl(bookId);
            json = (await HttpClient.fetchJson(tocUrl)).json;
            this.tocJson = json;
        }
        return this.chaptersFromJson(json);
    }

    makeTocUrl(bookId) {
        const encryptKey = "37e81a9d8f02596e1b895d07c171d5c9";
        const userId = "8000000";
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const sign = CryptoJS.MD5(
            `${bookId}${timestamp}${userId}${encryptKey}`,
        ).toString(CryptoJS.enc.Hex);
        return (
            "https://ocean.shuqireader.com/api/bcspub/qswebapi/book/chapterlist" +
            `?_=&bookId=${bookId}&user_id=${userId}&sign=${sign}&timestamp=${timestamp}`
        );
    }

    chaptersFromJson(json) {
        let data = json?.data;
        if (data == null) {
            return [];
        }
        let freePrefix = data.freeContUrlPrefix ?? "";
        let shortPrefix = data.shortContUrlPrefix ?? "";
        let chapters = [];
        let volumeList = data.chapterList?.[0]?.volumeList ?? [];

        // Some responses put chapters directly in volumeList (no chapterList field)
        // Others use volumeList[*].chapterList
        if (volumeList.length > 0 && volumeList[0]?.chapterName) {
            for (let chapter of volumeList) {
                let sourceUrl = this.makeChapterUrl(chapter, freePrefix, shortPrefix);
                if (util.isNullOrEmpty(sourceUrl)) {
                    continue;
                }
                chapters.push({
                    sourceUrl: sourceUrl,
                    title: chapter?.chapterName ?? "",
                });
            }
            return chapters;
        }

        for (let volume of volumeList) {
            let chapterList = volume?.chapterList ?? [];
            for (let chapter of chapterList) {
                let sourceUrl = this.makeChapterUrl(chapter, freePrefix, shortPrefix);
                if (util.isNullOrEmpty(sourceUrl)) {
                    continue;
                }
                chapters.push({
                    sourceUrl: sourceUrl,
                    title: chapter?.chapterName ?? "",
                });
            }
        }
        return chapters;
    }

    makeChapterUrl(chapter, freePrefix, shortPrefix) {
        let suffix = chapter?.contUrlSuffix ?? "";
        if (util.isNullOrEmpty(suffix)) {
            return null;
        }
        if (suffix.includes("reqEncryptParam")) {
            let shortSuffix = chapter?.shortContUrlSuffix ?? "";
            return util.isNullOrEmpty(shortSuffix)
                ? null
                : `${shortPrefix}${shortSuffix}`;
        }
        return `${freePrefix}${suffix}`;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        if (!util.isNullOrEmpty(this.bookInfo.title)) {
            return this.bookInfo.title;
        }
        let content = dom
            .querySelector("meta[property='og:title']")
            ?.getAttribute("content");
        return util.isNullOrEmpty(content) ? "" : content.trim();
    }

    extractAuthor(dom) {
        if (!util.isNullOrEmpty(this.bookInfo.author)) {
            return this.bookInfo.author;
        }
        let content = dom
            .querySelector("meta[property='og:novel:author']")
            ?.getAttribute("content");
        return util.isNullOrEmpty(content) ? "" : content.trim();
    }

    extractDescription(dom) {
        let content = dom
            .querySelector("meta[property='og:description']")
            ?.getAttribute("content");
        return util.isNullOrEmpty(content) ? "" : content.trim();
    }

    findCoverImageUrl(dom) {
        if (!util.isNullOrEmpty(this.bookInfo.cover)) {
            return this.bookInfo.cover;
        }
        let content = dom
            .querySelector("meta[property='og:image']")
            ?.getAttribute("content");
        return util.isNullOrEmpty(content) ? "" : content.trim();
    }

    extractLanguage() {
        return "zh";
    }

    findChapterTitle(dom, webPage) {
        if (
            webPage != null &&
            !util.isNullOrEmpty(webPage.title) &&
            webPage.title !== "[placeholder]"
        ) {
            return webPage.title;
        }
        return dom.querySelector("h1");
    }

    async fetchChapter(url) {
        let text = await HttpClient.fetchText(url);
        let json = null;
        try {
            json = JSON.parse(text);
        } catch {
            json = null;
        }

        let decoded = null;
        if (json != null) {

            let encoded =
                json.ChapterContent ??
                json?.data?.ChapterContent ??
                json.result ??
                json?.data?.result ??
                json?.data?.content ??
                json?.data;
            if (typeof encoded !== "string") {
            } else if (!util.isNullOrEmpty(encoded)) {

                decoded = this.decodeResult(encoded);
            }
        } else {
            console.log("[ShuqiParser] JSON parse failed");
        }

        if (decoded == null) {
            decoded = text;
        }

        let newDoc = Parser.makeEmptyDocForContent(url);
        let htmlCandidate = decoded;
        if (typeof htmlCandidate === "string" && htmlCandidate.includes("&lt;br")) {
            htmlCandidate = htmlCandidate.replace(/&lt;br\s*\/?>/gi, "<br/>");
        }
        if (Parser.looksLikeHtml(htmlCandidate) || /<br\s*\/?>/i.test(htmlCandidate)) {
            let sanitized = util.sanitize(htmlCandidate);
            newDoc.content.innerHTML = sanitized.body
                ? sanitized.body.innerHTML
                : htmlCandidate;
        } else {
            Parser.addTextToChapterContent(newDoc, decoded);
        }
        return newDoc.dom;
    }

    decodeResult(encoded) {
        if (util.isNullOrEmpty(encoded)) {
            return "";
        }
        try {
            let decoded = this.decodeChapterContent(encoded);
            console.log("[ShuqiParser] decodeResult", {
                encodedLength: encoded.length,
                decodedLength: decoded.length,
                decodedPrefix: decoded.slice(0, 32),
            });
            return decoded;
        } catch (error) {
            console.log("[ShuqiParser] decodeResult error", error);
            return "";
        }
    }

    decodeChapterContent(t) {
        return (
            (t = (function (t) {
                return t
                    .split("")
                    .map(function (t) {
                        var e, i;

                        return t.match(/[A-Za-z]/)
                            ? ((e = Math.floor(t.charCodeAt(0) / 97)),
                                (i = (t.toLowerCase().charCodeAt(0) - 83) % 26 || 26),
                                String.fromCharCode(i + (0 == e ? 64 : 96)))
                            : t;
                    })
                    .join("");
            })(t)),
            (function (t) {
                var e,
                    i,
                    a,
                    n,
                    r,
                    c,
                    o,
                    s =
                        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
                    d = "",
                    l = 0;

                for (t = t.replace(/[^A-Za-z0-9\+\/\=]/g, ""); l < t.length;)
                    ((n = s.indexOf(t.charAt(l++))),
                        (r = s.indexOf(t.charAt(l++))),
                        (c = s.indexOf(t.charAt(l++))),
                        (o = s.indexOf(t.charAt(l++))),
                        (e = (n << 2) | (r >> 4)),
                        (i = ((15 & r) << 4) | (c >> 2)),
                        (a = ((3 & c) << 6) | o),
                        (d += String.fromCharCode(e)),
                        64 != c && (d += String.fromCharCode(i)),
                        64 != o && (d += String.fromCharCode(a)));

                return (function (t) {
                    for (var e, i = "", a = 0, n = 0, r = 0; a < t.length;)
                        ((n = t.charCodeAt(a)),
                            n < 128
                                ? ((i += String.fromCharCode(n)), a++)
                                : n > 191 && n < 224
                                    ? ((r = t.charCodeAt(a + 1)),
                                        (i += String.fromCharCode(((31 & n) << 6) | (63 & r))),
                                        (a += 2))
                                    : ((r = t.charCodeAt(a + 1)),
                                        (e = t.charCodeAt(a + 2)),
                                        (i += String.fromCharCode(
                                            ((15 & n) << 12) | ((63 & r) << 6) | (63 & e),
                                        )),
                                        (a += 3)));

                    return i;
                })(d);
            })(t)
        );
    }

    static extractBookId(url) {
        if (util.isNullOrEmpty(url)) {
            return null;
        }
        let match = url.match(/\/book\/(\d+)(?:\.html)?/);
        if (match) {
            return match[1];
        }
        match = url.match(/[?&]bid=(\d+)/);
        return match ? match[1] : null;
    }

    static normalizeBookUrl(url) {
        if (util.isNullOrEmpty(url)) {
            return url;
        }
        try {
            let u = new URL(url);
            if (u.hostname === "www.shuqi.com") {
                u.hostname = "t.shuqi.com";
                return u.toString();
            }
        } catch {
            // ignore and return original
        }
        return url;
    }

    async ensureBookDom(dom) {
        if (this.bookDom != null) {
            return this.bookDom;
        }
        let base = dom?.baseURI;
        let normalized = ShuqiParser.normalizeBookUrl(base);
        if (normalized && normalized !== base) {
            try {
                this.bookDom = (await HttpClient.wrapFetch(normalized)).responseXML;
                this.bookUrl = normalized;
                return this.bookDom;
            } catch (error) {
                console.log("[ShuqiParser] ensureBookDom failed", error);
                return dom;
            }
        }
        this.bookDom = dom;
        this.bookUrl = base;
        return dom;
    }

    async ensureBookInfoFromApi(dom) {
        if (this.tocJson != null) {
            return;
        }
        let bookId = ShuqiParser.extractBookId(dom?.baseURI);
        if (util.isNullOrEmpty(bookId)) {
            return;
        }
        try {
            let tocUrl = this.makeTocUrl(bookId);
            this.tocJson = (await HttpClient.fetchJson(tocUrl)).json;
            let data = this.tocJson?.data;
            if (data != null) {
                if (util.isNullOrEmpty(this.bookInfo.title)) {
                    this.bookInfo.title = data.bookName ?? "";
                }
                if (util.isNullOrEmpty(this.bookInfo.author)) {
                    this.bookInfo.author = data.authorName ?? "";
                }
                if (util.isNullOrEmpty(this.bookInfo.cover)) {
                    this.bookInfo.cover = data.imgUrl ?? "";
                }
            }
        } catch (error) {
            console.log("[ShuqiParser] ensureBookInfoFromApi failed", error);
        }
    }
}
