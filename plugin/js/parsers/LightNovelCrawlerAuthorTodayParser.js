"use strict";

parserFactory.register("author.today", () => new LightNovelCrawlerAuthorTodayParser());


class LightNovelCrawlerAuthorTodayParser extends Parser {
    constructor() {
        super();
        this.title = "";
        this.cover = null;
        this.description = "";
        this.chapterList = [];
    }

    async loadEpubMetaInfo(dom) {
        let id = dom.baseURI.split("/").filter(Boolean).pop();
        if (util.isNullOrEmpty(id)) {
            return;
        }
        let headers = {
            "Authorization": "Bearer guest",
            "Cookie": "AdultUser=true"
        };
        let info = (await HttpClient.fetchJson(`https://api.author.today/v1/work/${id}/details`, { headers })).json;
        this.title = info?.title ?? "";
        this.cover = info?.coverUrl ?? null;
        this.description = info?.annotation ?? "";
        this.chapterList = (info?.chapters || [])
            .filter(ch => ch.isAvailable)
            .map(ch => ({
                sourceUrl: `https://author.today/reader/${ch.workId}/chapter?id=${ch.id}`,
                title: ch.title || ""
            }));
    }

    async getChapterUrls() {
        return this.chapterList;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    findChapterTitle(dom, webPage) {
        let title = (() => {
            const selector = null;
            return selector ? dom.querySelector(selector) : null;
                        
        })();
        return title ?? (webPage ? webPage.title : null);
    }

    extractTitleImpl(dom) {
        return util.isNullOrEmpty(this.title) ? super.extractTitleImpl(dom) : this.title;
    }

    extractAuthor(dom) {
        return super.extractAuthor(dom);
    }

    extractDescription() {
        return util.isNullOrEmpty(this.description) ? "" : this.description;
    }

    findCoverImageUrl(dom) {
        return this.cover || super.findCoverImageUrl(dom);
    }

    async fetchChapter(url) {
        let headers = {
            "Authorization": "Bearer guest",
            "Cookie": "AdultUser=true"
        };
        let xhr = await HttpClient.fetchJson(url, { headers });
        let chapterData = xhr.json?.data?.text ?? "";
        let readerSecret = xhr.response?.headers?.get("Reader-Secret") || "";
        let content = LightNovelCrawlerAuthorTodayParser.decryptChapter(chapterData, readerSecret);
        return LightNovelCrawlerAuthorTodayParser.textToDoc(content, url);
    }

    static decryptChapter(text, readerSecret) {
        if (util.isNullOrEmpty(text) || util.isNullOrEmpty(readerSecret)) {
            return text;
        }
        let cipher = readerSecret.split("").reverse().join("") + "@_@";
        let bytes = LightNovelCrawlerAuthorTodayParser.utf16leBytes(text);
        let chapterE = [];
        for (let i = 0; i + 1 < bytes.length; i += 2) {
            chapterE.push((bytes[i + 1] << 8) | bytes[i]);
        }
        let chapterD = [0xFEFF];
        for (let i = 0; i < chapterE.length; i++) {
            chapterD.push(chapterE[i] ^ cipher.charCodeAt(i % cipher.length));
        }
        let outBytes = new Uint8Array(chapterD.length * 2);
        for (let i = 0; i < chapterD.length; i++) {
            let value = chapterD[i];
            outBytes[i * 2] = value >> 8;
            outBytes[i * 2 + 1] = value & 0xFF;
        }
        return new TextDecoder("utf-16").decode(outBytes);
    }

    static utf16leBytes(text) {
        let bytes = new Uint8Array(text.length * 2);
        for (let i = 0; i < text.length; i++) {
            let code = text.charCodeAt(i);
            bytes[i * 2] = code & 0xFF;
            bytes[i * 2 + 1] = code >> 8;
        }
        return bytes;
    }

    static textToDoc(content, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        if (/<\/?[a-z][\s>]/i.test(content)) {
            newDoc.content.innerHTML = content;
        } else {
            Parser.addTextToChapterContent(newDoc, content);
        }
        return newDoc.dom;
    }

    getInformationEpubItemChildNodes(dom) {
        const selector = null;
        return selector ? [...dom.querySelectorAll(selector)] : [];
    }

    removeUnwantedElementsFromContentElement(element) {
        const removeSelectors = [];
        const removeTags = [];
        for (let selector of removeSelectors) {
            util.removeChildElementsMatchingSelector(element, selector);
        }
        for (let tag of removeTags) {
            util.removeElements(element.querySelectorAll(tag));
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

}

