"use strict";

parserFactory.register("nyx-translation.com", () => new LightNovelCrawlerNYXTranslationParser());
parserFactory.register("nyxtranslation.home.blog", () => new LightNovelCrawlerNYXTranslationParser());


class LightNovelCrawlerNYXTranslationParser extends Parser {
    constructor() {
        super();
        this.title = "";
        this.author = "";
        this.cover = null;
        this.description = "";
        this.tags = [];
    }

    async loadEpubMetaInfo(dom) {
        let content = dom.querySelector("main#main > article");
        if (!content) {
            return;
        }
        let entryTitle = content.querySelector("h1.entry-title");
        if (entryTitle) {
            this.title = entryTitle.textContent.trim();
        }

        let genreLabel = [...content.querySelectorAll("strong")]
            .find(e => /Genre.*:/i.test(e.textContent || ""));
        if (genreLabel) {
            let tagsNode = genreLabel.nextSibling;
            let tagsText = tagsNode?.textContent ?? "";
            if (tagsText.includes(", ")) {
                this.tags = tagsText.split(", ").filter(Boolean);
            }
        }

        let authorLabel = [...content.querySelectorAll("strong")]
            .find(e => /Author.*:?.*/i.test(e.textContent || ""));
        if (authorLabel) {
            let authorNode = authorLabel.nextSibling;
            if (authorNode?.textContent?.includes(": ")) {
                authorNode = authorNode.nextSibling;
            }
            this.author = authorNode?.textContent?.trim() ?? this.author;
        }

        let cover = content.querySelector("img");
        if (cover) {
            let src = cover.getAttribute("src") || "";
            if (src.startsWith("data:")) {
                src = cover.getAttribute("data-orig-file") || src;
            }
            this.cover = new URL(src, dom.baseURI).href;
        }

        let descriptionStart = [...content.querySelectorAll("p")]
            .find(p => (p.textContent || "").trim() === "Description");
        if (descriptionStart) {
            let desc = "";
            let node = descriptionStart.nextSibling;
            while (node) {
                if (node.nodeType !== Node.ELEMENT_NODE) {
                    node = node.nextSibling;
                    continue;
                }
                let el = node;
                if (el.tagName !== "P") {
                    break;
                }
                if ((el.textContent || "").includes("Alternative Name(s)")) {
                    break;
                }
                desc += el.textContent + "\n";
                node = node.nextSibling;
            }
            this.description = desc.trim();
        }
    }

    async getChapterUrls(dom) {
        let content = dom.querySelector("main#main > article");
        if (!content) {
            return [];
        }
        let chaptersStart = [...content.querySelectorAll("p")]
            .find(p => /Table of Contents?/i.test(p.textContent || ""));
        if (!chaptersStart) {
            return [];
        }

        let chapters = [];
        let chapPrefix = "";
        let node = chaptersStart.nextSibling;
        while (node) {
            if (node.nodeType !== Node.ELEMENT_NODE) {
                node = node.nextSibling;
                continue;
            }
            let el = node;
            if ((el.tagName === "DIV" && el.hasAttribute("aria-hidden")) || util.isNullOrEmpty(el.textContent)) {
                node = node.nextSibling;
                continue;
            }
            let links = [...el.querySelectorAll("a")];
            if (links.length === 0) {
                if (LightNovelCrawlerNYXTranslationParser.isVolume(el.textContent || "")) {
                    // ignore volume info for now
                } else {
                    if (["DIV", "SCRIPT", "FOOTER"].includes(el.tagName)) {
                        break;
                    }
                    chapPrefix = el.textContent;
                }
            } else {
                for (let link of links) {
                    let href = link.getAttribute("href") || "";
                    if (!LightNovelCrawlerNYXTranslationParser.onSite(href)) {
                        node = chaptersStart.parentElement?.nextSibling;
                        break;
                    }
                    if (!/.+-part-\\d+.*/i.test(href.toLowerCase())) {
                        chapPrefix = "";
                    }
                    let title = `${chapPrefix} ${link.textContent.toLowerCase()}`.trim();
                    chapters.push({
                        sourceUrl: new URL(href, dom.baseURI).href,
                        title: title
                    });
                }
            }
            node = node.nextSibling;
        }
        return chapters;
    }

    findContent(dom) {
        const selector = "div.entry-content";
        if (selector) {
            let content = dom.querySelector(selector);
            if (content) {
                return content;
            }
        }
        return dom.body || dom.documentElement;
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
        const removeTags = ["script", "a"];
        for (let selector of removeSelectors) {
            util.removeChildElementsMatchingSelector(element, selector);
        }
        for (let tag of removeTags) {
            util.removeElements(element.querySelectorAll(tag));
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    static isVolume(text) {
        let aliases = ["volume", "arc", "series", "saga", "chronicle", "tome", "storyline"];
        let lower = text.toLowerCase();
        return aliases.some(a => lower.includes(a));
    }

    static onSite(href) {
        if (href.toLowerCase().startsWith("http")) {
            return href.startsWith("https://nyx-translation.com/") ||
                href.startsWith("https://nyxtranslation.home.blog/");
        }
        return true;
    }

}

