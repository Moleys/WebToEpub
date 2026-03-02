"use strict";

parserFactory.register("novel.ovh", () => new IReaderNovelOvhParser());

class IReaderNovelOvhParser extends Parser {
    constructor() {
        super();
        this.bookData = null;
        this.slug = null;
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let slug = IReaderNovelOvhParser.slugFromUrl(dom.baseURI);
        if (util.isNullOrEmpty(slug)) {
            return [];
        }
        this.slug = slug;
        this.bookData = await IReaderNovelOvhParser.fetchBookData(slug);
        let chaptersArray = this.bookData?.chapters ?? [];
        let total = chaptersArray.length;
        let chapters = chaptersArray.map((chapter, index) => {
            let id = chapter?.id;
            if (util.isNullOrEmpty(id)) {
                return null;
            }
            let title = chapter?.title ?? "";
            let volume = chapter?.volume ?? 0;
            let number = chapter?.number ?? (total - index);
            let chapterName = chapter?.name ?? "";
            if (util.isNullOrEmpty(title)) {
                let volumeLabel = "\u0422\u043e\u043c";
                let chapterLabel = "\u0413\u043b\u0430\u0432\u0430";
                let namePart = util.isNullOrEmpty(chapterName)
                    ? `${chapterLabel} ${number}`
                    : chapterName;
                title = `${volumeLabel} ${volume} ${namePart}`.trim();
            }
            return {
                sourceUrl: `https://novel.ovh/reader/book/${slug}/${id}`,
                title: title
            };
        }).filter(c => c != null);
        if (chapters.length > 0) {
            chapterUrlsUI.showTocProgress(chapters);
        }
        return chapters.reverse();
    }

    static slugFromUrl(url) {
        let parts = new URL(url).pathname.split("/").filter(Boolean);
        return parts[parts.length - 1] ?? "";
    }

    static async fetchBookData(slug) {
        let url = `https://novel.ovh/content/${slug}?_data=routes/reader/book/$slug/index`;
        return (await HttpClient.fetchJson(url)).json;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom) || dom.body || dom.documentElement;
    }

    extractTitleImpl(dom) {
        let title = this.bookData?.book?.name?.ru;
        if (!util.isNullOrEmpty(title)) {
            return title;
        }
        return super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        let relations = this.bookData?.book?.relations ?? [];
        for (let rel of relations) {
            if (rel?.type === "AUTHOR") {
                let author = rel?.publisher?.name;
                if (!util.isNullOrEmpty(author)) {
                    return author;
                }
            }
        }
        return super.extractAuthor(dom);
    }

    extractDescription() {
        return this.bookData?.book?.description ?? "";
    }

    extractSubject() {
        let labels = this.bookData?.book?.labels ?? [];
        return labels.map(label => label?.name).filter(Boolean).join(", ");
    }

    findCoverImageUrl(dom) {
        let cover = this.bookData?.book?.poster;
        return util.isNullOrEmpty(cover) ? super.findCoverImageUrl(dom) : cover;
    }

    async fetchChapter(url) {
        let chapterId = IReaderNovelOvhParser.chapterIdFromUrl(url);
        if (util.isNullOrEmpty(chapterId)) {
            return (await HttpClient.wrapFetch(url)).responseXML;
        }
        let apiUrl = `https://api.novel.ovh/v2/chapters/${chapterId}`;
        let json = (await HttpClient.fetchJson(apiUrl)).json;
        let imageMap = {};
        for (let page of (json?.pages ?? [])) {
            if (page?.id && page?.image) {
                imageMap[page.id] = page.image;
            }
        }
        let content = json?.content?.content ?? [];
        let html = IReaderNovelOvhParser.buildContentHtml(content, imageMap);
        let newDoc = Parser.makeEmptyDocForContent(url);
        util.parseHtmlAndInsertIntoContent(html, newDoc.content);
        return newDoc.dom;
    }

    static chapterIdFromUrl(url) {
        let parts = new URL(url).pathname.split("/").filter(Boolean);
        return parts[parts.length - 1] ?? "";
    }

    static buildContentHtml(contentArray, imageMap) {
        let html = "";
        for (let element of contentArray) {
            let type = element?.type;
            if (!type) {
                continue;
            }
            switch (type) {
                case "image": {
                    let pageId = element?.attrs?.pages?.[0];
                    let img = imageMap[pageId];
                    if (img) {
                        html += `<img src=\"${img}\" />`;
                    }
                    break;
                }
                case "hardBreak":
                    html += "<br>";
                    break;
                case "horizontalRule":
                case "delimiter":
                    html += "<h2 style=\"text-align: center\">***</h2>";
                    break;
                case "paragraph": {
                    let inner = IReaderNovelOvhParser.buildContentHtml(element?.content ?? [], imageMap);
                    html += `<p>${util.isNullOrEmpty(inner) ? "<br>" : inner}</p>`;
                    break;
                }
                case "orderedList": {
                    let inner = IReaderNovelOvhParser.buildContentHtml(element?.content ?? [], imageMap);
                    html += `<ol>${inner}</ol>`;
                    break;
                }
                case "listItem": {
                    let inner = IReaderNovelOvhParser.buildContentHtml(element?.content ?? [], imageMap);
                    html += `<li>${inner}</li>`;
                    break;
                }
                case "blockquote": {
                    let inner = IReaderNovelOvhParser.buildContentHtml(element?.content ?? [], imageMap);
                    html += `<blockquote>${inner}</blockquote>`;
                    break;
                }
                case "italic": {
                    let inner = IReaderNovelOvhParser.buildContentHtml(element?.content ?? [], imageMap);
                    html += `<i>${inner}</i>`;
                    break;
                }
                case "bold": {
                    let inner = IReaderNovelOvhParser.buildContentHtml(element?.content ?? [], imageMap);
                    html += `<b>${inner}</b>`;
                    break;
                }
                case "underline": {
                    let inner = IReaderNovelOvhParser.buildContentHtml(element?.content ?? [], imageMap);
                    html += `<u>${inner}</u>`;
                    break;
                }
                case "heading": {
                    let inner = IReaderNovelOvhParser.buildContentHtml(element?.content ?? [], imageMap);
                    html += `<h2>${inner}</h2>`;
                    break;
                }
                case "text": {
                    let text = element?.text ?? "";
                    html += text;
                    break;
                }
                default:
                    break;
            }
        }
        return html;
    }
}
