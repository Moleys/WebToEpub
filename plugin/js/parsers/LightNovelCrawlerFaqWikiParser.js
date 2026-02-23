"use strict";

parserFactory.register("faqwiki.us", () => new LightNovelCrawlerFaqWikiParser());
parserFactory.register("faqwiki.xyz", () => new LightNovelCrawlerFaqWikiParser());


class LightNovelCrawlerFaqWikiParser extends Parser {
    constructor() {
        super();
        this.title = "";
        this.author = "FaqWiki";
        this.cover = null;
        this.description = "";
        this.tags = [];
    }

    async loadEpubMetaInfo(dom) {
        let entryTitle = dom.querySelector("h1.entry-title");
        if (entryTitle) {
            let title = entryTitle.textContent.trim();
            title = title.replace(/\s*\u00e2\u20ac\u201c\s*All Chapters$/i, "");
            title = title.replace(/\s*\u2013\s*All Chapters$/i, "");
            this.title = title;
        }

        let content = dom.querySelector(".entry-content");
        let cover = content?.querySelector(".wp-block-image img");
        if (cover) {
            let src = cover.getAttribute("src") || "";
            if (src.startsWith("data:")) {
                src = cover.getAttribute("data-ezsrc") || src;
            }
            if (src.includes("?")) {
                src = src.split("?")[0];
            }
            this.cover = src;
        }

        let meta = dom.querySelector("div.book-review-block__meta-item-value");
        if (meta) {
            let metadata = meta.textContent || "";
            let keys = {
                desc: "Description:",
                alt_name: "Alternate Names:",
                genre: "Genre:",
                author: "Author(s):",
                status: "Status:",
                original_pub: "Original Publisher:"
            };
            let pos = {};
            for (let [key, sep] of Object.entries(keys)) {
                pos[`${key}_start`] = metadata.indexOf(sep);
                pos[key] = pos[`${key}_start`] + sep.length;
            }
            if (0 <= pos.desc && 0 <= pos.alt_name_start) {
                this.description = metadata.slice(pos.desc, pos.alt_name_start).trim();
            }
            if (0 <= pos.genre && 0 <= pos.author_start) {
                this.tags = metadata.slice(pos.genre, pos.author_start).trim().split(" ").filter(Boolean);
            }
            if (0 <= pos.author && 0 <= pos.status_start) {
                this.author = metadata.slice(pos.author, pos.status_start).trim() || this.author;
            }
        }
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("#lcp_instance_0 li > a")]
            .filter(a => a && a.href)
            .filter(a => (a.textContent || "").toLowerCase().includes("chapter"));
        let chapters = [];
        for (let i = 0; i < links.length; i++) {
            chapters.push({
                sourceUrl: links[i].href,
                title: `Chapter ${i + 1}`
            });
        }
        return chapters;
    }

    findContent(dom) {
        return dom.querySelector("div.entry-content") || dom.body || dom.documentElement;
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

    extractSubject() {
        return this.tags.join(", ");
    }

    extractDescription() {
        return util.isNullOrEmpty(this.description) ? "" : this.description;
    }

    getInformationEpubItemChildNodes(dom) {
        const selector = null;
        return selector ? [...dom.querySelectorAll(selector)] : [];
    }

    removeUnwantedElementsFromContentElement(element) {
        const removeSelectors = [];
        const removeTags = ["img"];
        for (let selector of removeSelectors) {
            util.removeChildElementsMatchingSelector(element, selector);
        }
        for (let tag of removeTags) {
            util.removeElements(element.querySelectorAll(tag));
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

}

