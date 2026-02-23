"use strict";

parserFactory.register("renovels.org", () => new LightNovelCrawlerRenovelsParser());


class LightNovelCrawlerRenovelsParser extends Parser {
    constructor() {
        super();
        this.title = "";
        this.description = "";
        this.cover = null;
        this.novelId = null;
        this.baseUrl = null;
        this.chapterList = [];
    }

    async loadEpubMetaInfo(dom) {
        let script = dom.querySelector("script#__NEXT_DATA__")?.textContent;
        if (!util.isNullOrEmpty(script)) {
            try {
                let json = JSON.parse(script);
                let content = json?.props?.pageProps?.fallbackData?.content;
                this.novelId = content?.branches?.[0]?.id ?? null;
                let img = content?.img?.high;
                this.cover = img ? new URL(img, dom.baseURI).href : null;
            } catch (error) {
                // ignore parse failure
            }
        }
        let title = dom.querySelector("h1[itemprop='name']")?.textContent;
        if (title) {
            this.title = title.split("[")[0].trim();
        }
        let synopsis = dom.querySelector("div[itemprop='description']")?.textContent;
        if (synopsis) {
            this.description = synopsis.trim();
        }
        this.baseUrl = dom.baseURI.split("?")[0].replace(/\/(about|content)\/?$/, "");
        if (this.chapterList.length === 0) {
            this.chapterList = await this.fetchChapterList();
        }
    }

    async fetchChapterList() {
        if (this.novelId == null) {
            return [];
        }
        let chapters = [];
        let page = 1;
        while (true) {
            let url = `https://api.renovels.org/api/titles/chapters/?branch_id=${this.novelId}&ordering=-index&user_data=1&count=100&page=${page}`;
            let data = (await HttpClient.fetchJson(url)).json?.content;
            if (!data || data.length === 0) {
                break;
            }
            chapters.push(...data);
            if (data[data.length - 1]?.index === 1) {
                break;
            }
            page += 1;
        }
        let baseUrl = this.baseUrl || "";
        return chapters.reverse().map(chapter => ({
            sourceUrl: `${baseUrl}/${chapter.id}`,
            title: chapter.name ? chapter.name : chapter.chapter
        }));
    }

    async getChapterUrls() {
        if (this.chapterList.length === 0) {
            this.chapterList = await this.fetchChapterList();
        }
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
        const selector = null;
        if (selector) {
            let authors = [...dom.querySelectorAll(selector)]
                .map(e => e.textContent.trim())
                .filter(t => !util.isNullOrEmpty(t));
            if (authors.length > 0) {
                return authors.join(", ");
            }
        }
        return super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        return this.cover || super.findCoverImageUrl(dom);
    }

    extractDescription() {
        return util.isNullOrEmpty(this.description) ? "" : this.description;
    }

    async fetchChapter(url) {
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        let script = chapterDom.querySelector("script#__NEXT_DATA__")?.textContent;
        if (util.isNullOrEmpty(script)) {
            return chapterDom;
        }
        try {
            let json = JSON.parse(script);
            let html = json?.props?.pageProps?.fallbackData?.chapter?.content?.content;
            if (util.isNullOrEmpty(html)) {
                return chapterDom;
            }
            return LightNovelCrawlerRenovelsParser.textToDoc(html, url);
        } catch (error) {
            return chapterDom;
        }
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

