"use strict";

parserFactory.register("agit664.xyz", () => new IReaderAgitoonParser());

class IReaderAgitoonParser extends Parser {
    constructor() {
        super();
        this.resolvedUrl = null;
        this.baseUrl = "https://agit664.xyz";
    }

    async resolveBaseUrl() {
        if (this.resolvedUrl != null) {
            return this.resolvedUrl;
        }
        try {
            let xhr = await HttpClient.wrapFetch(this.baseUrl);
            let resolved = xhr.response?.url ?? this.baseUrl;
            this.resolvedUrl = resolved.replace(/\/$/, "");
        } catch (error) {
            this.resolvedUrl = this.baseUrl;
        }
        return this.resolvedUrl;
    }

    async getChapterUrls(dom) {
        let base = await this.resolveBaseUrl();
        let bookId = IReaderAgitoonParser.extractBookId(dom.baseURI);
        if (util.isNullOrEmpty(bookId)) {
            return [];
        }
        let params = new URLSearchParams();
        params.append("mode", "get_data_novel_list_c");
        params.append("wr_id_p", bookId);
        params.append("page_no", "1");
        params.append("cnt_list", "10000");
        params.append("order_type", "Asc");

        let options = {
            method: "POST",
            credentials: "include",
            body: params
        };
        let json = (await HttpClient.fetchJson(`${base}/novel/list.update.php`, options)).json;
        let list = json?.list ?? [];
        return list.map((item, index) => ({
            sourceUrl: `${base}/novel/view/${item.wr_id}/2`,
            title: item.wr_subject ?? `Chapter ${index + 1}`
        }));
    }

    static extractBookId(url) {
        let match = url.match(/\/novel\/list\/(\d+)/);
        if (match?.[1]) {
            return match[1];
        }
        let parts = new URL(url).pathname.split("/").filter(Boolean);
        return parts[parts.length - 1] ?? "";
    }

    findContent(dom) {
        const selector = "#id_wr_content";
        if (selector) {
            let content = dom.querySelector(selector);
            if (content) {
                return content;
            }
        }
        return dom.body || dom.documentElement;
    }

    removeUnwantedElementsFromContentElement(element) {
        const popupText = "\ud30c\uc5c5\uba54\ub274";
        for (let node of [...element.querySelectorAll("p, div, span")]) {
            if (node.textContent?.includes(popupText)) {
                node.remove();
            }
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom, webPage) {
        let title = (() => {
            const selector = null;
            return selector ? dom.querySelector(selector) : null;
        })();
        return title ?? (webPage ? webPage.title : null);
    }

    extractTitleImpl(dom) {
        const selector = "h5.pt-2";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        const selector = ".post-item-list-cate-v";
        let text = selector ? dom.querySelector(selector)?.textContent?.trim() : null;
        if (!util.isNullOrEmpty(text)) {
            let parts = text.split(" : ");
            let author = parts[1]?.trim();
            if (!util.isNullOrEmpty(author)) {
                return author;
            }
        }
        return super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        const selector = "div.col-5.pr-0.pl-0 img";
        let img = selector ? dom.querySelector(selector) : null;
        return img?.getAttribute("src") || super.findCoverImageUrl(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        const selector = ".pt-1.mt-1.pb-1.mb-1";
        return selector ? [...dom.querySelectorAll(selector)] : [];
    }
}
