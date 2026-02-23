"use strict";

parserFactory.register("novelsala.com", () => new LightNovelCrawlerNovelSalaParser());


class LightNovelCrawlerNovelSalaParser extends Parser {
    constructor() {
        super();
        this.title = "";
        this.author = "";
        this.cover = null;
        this.buildId = null;
        this.bookSlug = null;
        this.bookUrl = null;
        this.chapterList = [];
        this.chapterJsonByUrl = new Map();
    }

    async loadEpubMetaInfo(dom) {
        let script = dom.querySelector("script#__NEXT_DATA__")?.textContent;
        if (util.isNullOrEmpty(script)) {
            return;
        }
        let json = JSON.parse(script);
        this.buildId = json?.buildId ?? null;
        let bookNode = json?.props?.pageProps?.relayData?.[0]?.[1]?.data?.book?.edges?.[0]?.node;
        this.title = bookNode?.title ?? "";
        this.cover = bookNode?.coverLg ?? null;
        this.author = bookNode?.author?.name ?? "";
        this.bookSlug = bookNode?.slug ?? null;
        this.bookUrl = bookNode?.url ?? null;
        if (this.chapterList.length === 0) {
            this.chapterList = await this.fetchChapterList();
        }
    }

    async getChapterUrls(dom) {
        if (this.chapterList.length === 0) {
            this.chapterList = await this.fetchChapterList();
        }
        return this.chapterList;
    }

    async fetchChapterList() {
        if (util.isNullOrEmpty(this.bookSlug) || util.isNullOrEmpty(this.bookUrl) || util.isNullOrEmpty(this.buildId)) {
            return [];
        }
        let chunks = await this.fetchChapterChunk(1);
        if (!chunks || chunks.length === 0) {
            return [];
        }
        let chapters = [];
        for (let i = 0; i < chunks.length; i++) {
            let volume = chunks[i];
            if (i !== 0) {
                let other = await this.fetchChapterChunk(volume.startChapNum);
                volume = other[i];
            }
            for (let chapter of volume.items) {
                let url = new URL(chapter.url, "https://novelsala.com/").href;
                let bookUrl = this.bookUrl.endsWith("/") ? this.bookUrl : `${this.bookUrl}/`;
                let dataUrlBase = `https://novelsala.com/_next/data/${this.buildId}/en${bookUrl}`;
                let jsonUrl = `${dataUrlBase}chapter-${chapter.chapNum}.json`;
                this.chapterJsonByUrl.set(url, jsonUrl);
                chapters.push({
                    sourceUrl: url,
                    title: `Chapter ${chapter.chapNum}: ${chapter.title}`
                });
            }
        }
        return chapters;
    }

    async fetchChapterChunk(startChapNum) {
        let query = "query chapters_NovelRefetchQuery(\\n  $slug: String!\\n  $startChapNum: Int\\n) {\\n  ...chapters_list_items\\n}\\n\\nfragment chapters_list_items on Query {\\n  chapterListChunks(bookSlug: $slug, chunkSize: 100, startChapNum: $startChapNum) {\\n    items {\\n      title\\n      chapNum\\n      url\\n      refId\\n      id\\n    }\\n    title\\n    startChapNum\\n  }\\n}";
        let body = {
            id: "chapters_NovelRefetchQuery",
            query: query,
            variables: { slug: this.bookSlug, startChapNum: startChapNum }
        };
        let response = await HttpClient.fetchJson("https://novelsala.com/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        return response.json?.data?.chapterListChunks || [];
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
        return util.isNullOrEmpty(this.author) ? super.extractAuthor(dom) : this.author;
    }

    findCoverImageUrl(dom) {
        return this.cover || super.findCoverImageUrl(dom);
    }

    async fetchChapter(url) {
        let jsonUrl = this.chapterJsonByUrl.get(url);
        if (util.isNullOrEmpty(jsonUrl)) {
            return (await HttpClient.wrapFetch(url)).responseXML;
        }
        let data = (await HttpClient.fetchJson(jsonUrl)).json;
        let chapterData = data?.pageProps?.relayData?.[0]?.[1]?.data?.chapter2;
        let html = chapterData?.contentHtml ?? "";
        return LightNovelCrawlerNovelSalaParser.textToDoc(html, url);
    }

    static textToDoc(html, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        newDoc.content.innerHTML = html || "";
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

