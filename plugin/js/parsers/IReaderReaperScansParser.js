"use strict";

parserFactory.register("reaperscans.com", () => new IReaderReaperScansParser());

class IReaderReaperScansParser extends Parser {
    constructor() {
        super();
        this.apiBase = "https://api.reaperscans.com";
        this.mediaBase = "https://media.reaperscans.com/file/4SRBHm/";
        this.seriesInfo = null;
    }

    async getChapterUrls(dom) {
        let seriesSlug = IReaderReaperScansParser.seriesSlugFromUrl(dom.baseURI);
        if (util.isNullOrEmpty(seriesSlug)) {
            return [];
        }
        await this.loadSeriesInfo(seriesSlug);
        let url = `${this.apiBase}/chapters/${seriesSlug}?perPage=9999`;
        let json = (await HttpClient.fetchJson(url)).json;
        let data = json?.data ?? [];
        let chapters = data.map(item => ({
            sourceUrl: `https://reaperscans.com/series/${seriesSlug}/${item.chapter_slug}`,
            title: item.chapter_name ?? "Chapter",
            number: parseFloat(item.index) || 0
        })).filter(c => !util.isNullOrEmpty(c.sourceUrl));
        return chapters.reverse();
    }

    static seriesSlugFromUrl(url) {
        let match = url.match(/\/series\/([^/?#]+)/);
        return match?.[1] ?? "";
    }

    async loadSeriesInfo(seriesSlug) {
        if (this.seriesInfo?.series_slug === seriesSlug) {
            return this.seriesInfo;
        }
        let json = (await HttpClient.fetchJson(`${this.apiBase}/series/${seriesSlug}`)).json;
        this.seriesInfo = { series_slug: seriesSlug, ...json };
        return this.seriesInfo;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom) || dom.body || dom.documentElement;
    }

    extractTitleImpl(dom) {
        let title = this.seriesInfo?.title;
        if (!util.isNullOrEmpty(title)) {
            return title;
        }
        return super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        let author = this.seriesInfo?.author;
        return util.isNullOrEmpty(author) ? super.extractAuthor(dom) : author;
    }

    extractDescription() {
        return this.seriesInfo?.description ?? "";
    }

    extractSubject() {
        let tags = this.seriesInfo?.tags ?? [];
        return Array.isArray(tags) ? tags.join(", ") : "";
    }

    findCoverImageUrl(dom) {
        let thumbnail = this.seriesInfo?.thumbnail ?? "";
        if (util.isNullOrEmpty(thumbnail)) {
            return super.findCoverImageUrl(dom);
        }
        return thumbnail.startsWith("novels/") ? this.mediaBase + thumbnail : thumbnail;
    }

    async fetchChapter(url) {
        let html = await HttpClient.wrapFetchImpl(url, {
            responseHandler: new FetchTextResponseHandler(),
            fetchOptions: {
                method: "GET",
                headers: {
                    "RSC": "1"
                },
                credentials: "include"
            }
        });
        let contentHtml = IReaderReaperScansParser.extractChapterContent(html);
        let newDoc = Parser.makeEmptyDocForContent(url);
        util.parseHtmlAndInsertIntoContent(contentHtml, newDoc.content);
        return newDoc.dom;
    }

    findChapterTitle(dom, webPage) {
        return super.findChapterTitle(dom, webPage) ?? (webPage ? webPage.title : null);
    }

    static extractChapterContent(chapter) {
        let lines = chapter.split("\n");
        let startIndex = lines.findIndex(line => line.includes("<p"));
        if (startIndex === -1) {
            return chapter;
        }
        let prefix = lines[startIndex].substring(0, lines[startIndex].indexOf("<"));
        if (!prefix.includes(":") || !prefix.includes(",")) {
            return lines.slice(startIndex).join("\n");
        }
        let commonPrefix = prefix.substring(prefix.indexOf(":"), prefix.indexOf(","));
        let endIndex = lines.lastIndexOf(commonPrefix);
        if (endIndex <= startIndex) {
            return lines.slice(startIndex).join("\n");
        }
        let content = lines.slice(startIndex, endIndex).join("\n");
        let parts = content.split(commonPrefix);
        if (parts.length < 2) {
            return content;
        }
        let deduplicated = parts[1];
        let htmlStart = deduplicated.indexOf("<");
        let htmlEnd = deduplicated.lastIndexOf(">");
        return (htmlStart >= 0 && htmlEnd > htmlStart)
            ? deduplicated.substring(htmlStart, htmlEnd + 1)
            : deduplicated;
    }
}
