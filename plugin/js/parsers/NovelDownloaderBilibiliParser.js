"use strict";

parserFactory.register("www.bilibili.com", () => new NovelDownloaderBilibiliParser());

class NovelDownloaderBilibiliParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let bookIdMatch = dom.baseURI.match(/readlist\/rl(\d+)/);
        let bookId = bookIdMatch ? bookIdMatch[1] : null;
        if (util.isNullOrEmpty(bookId)) {
            return [];
        }
        let apiUrl = `https://api.bilibili.com/x/article/list/web/articles?id=${bookId}`;
        let response = (await HttpClient.fetchJson(apiUrl)).json;
        let articles = response?.data?.articles || [];
        return articles.map(article => {
            return {
                sourceUrl: `https://www.bilibili.com/read/cv${article.id}`,
                title: article.title,
                chapterImageUrl: (article.image_urls && article.image_urls.length > 0)
                    ? article.image_urls[0]
                    : null
            };
        });
    }

    findContent(dom) {
        return dom.querySelector("div.opus-module-content")
            || dom.querySelector("div.article-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".list-header .title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".up-name");
        if (authorLabel && authorLabel.textContent) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector("div.introduce");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "img.cover");
    }

    customRawDomToContentStep(webPage, content) {
        if (!content) {
            return;
        }
        let imageUrl = webPage.chapterImageUrl;
        if (!util.isNullOrEmpty(imageUrl)) {
            let label = webPage.rawDom.createElement("p");
            label.textContent = "\u7ae0\u8282\u5c01\u9762\u63d2\u56fe";
            let img = webPage.rawDom.createElement("img");
            img.setAttribute("src", imageUrl);
            content.insertBefore(img, content.firstChild);
            content.insertBefore(label, img);
        }
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
    }
}
