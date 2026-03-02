"use strict";

parserFactory.register("uaranobe.club", () => new IReaderUaRanobeClubParser());

class IReaderUaRanobeClubParser extends Parser {
    constructor() {
        super();
        this.graphqlEndpoint = "https://uaranobe.club/graphql";
        this.writingData = null;
        this.writingSlug = null;
    }

    async graphqlRequest(query, variables) {
        let options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                query: query,
                variables: variables
            })
        };
        let json = (await HttpClient.fetchJson(this.graphqlEndpoint, options)).json;
        return json;
    }

    async getChapterUrls(dom) {
        let slug = IReaderUaRanobeClubParser.slugFromUrl(dom.baseURI);
        if (util.isNullOrEmpty(slug)) {
            return [];
        }
        this.writingSlug = slug;
        let query = `
            query Writing($slug: String!) {
              writingBySlug(slug: $slug) {
                id
                title
                image
                description
                genres {
                  genre {
                    name
                  }
                }
                scanlators {
                  scanlator {
                    episodes(oldestFirst: false, slug: $slug) {
                      seqTitle
                      title
                      slug
                      subId
                    }
                  }
                }
              }
            }
        `;
        let data = await this.graphqlRequest(query, { slug: slug });
        this.writingData = data?.data?.writingBySlug ?? null;
        let episodes = this.writingData?.scanlators?.[0]?.scanlator?.episodes ?? [];
        return episodes.map(ep => {
            let seqTitle = ep?.seqTitle ?? "";
            let title = ep?.title ?? "";
            let name = util.isNullOrEmpty(seqTitle) ? title : `${seqTitle}. ${title}`;
            let episodeSlug = ep?.slug;
            let sourceUrl = `https://uaranobe.club/episode/${episodeSlug}?writing=${slug}`;
            return {
                sourceUrl: sourceUrl,
                title: name
            };
        }).filter(c => !util.isNullOrEmpty(c.sourceUrl));
    }

    static slugFromUrl(url) {
        let match = url.match(/\/writing\/([^/?#]+)/);
        if (match?.[1]) {
            return match[1];
        }
        let parts = new URL(url).pathname.split("/").filter(Boolean);
        return parts[parts.length - 1] ?? "";
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom) || dom.body || dom.documentElement;
    }

    extractTitleImpl(dom) {
        let title = this.writingData?.title;
        if (!util.isNullOrEmpty(title)) {
            return title;
        }
        return super.extractTitleImpl(dom);
    }

    extractDescription() {
        return this.writingData?.description ?? "";
    }

    extractSubject() {
        let genres = this.writingData?.genres ?? [];
        return genres.map(g => g?.genre?.name).filter(Boolean).join(", ");
    }

    findCoverImageUrl(dom) {
        let cover = this.writingData?.image;
        return util.isNullOrEmpty(cover) ? super.findCoverImageUrl(dom) : cover;
    }

    async fetchChapter(url) {
        let episodeSlug = IReaderUaRanobeClubParser.episodeSlugFromUrl(url);
        let writingSlug = IReaderUaRanobeClubParser.writingSlugFromUrl(url) || this.writingSlug;
        if (util.isNullOrEmpty(episodeSlug) || util.isNullOrEmpty(writingSlug)) {
            return (await HttpClient.wrapFetch(url)).responseXML;
        }
        let query = `
            query EpisodeBySlug($slug: String!, $writingSlug: String!) {
              episodeBySlug(slug: $slug, writingSlug: $writingSlug) {
                text
              }
            }
        `;
        let data = await this.graphqlRequest(query, { slug: episodeSlug, writingSlug: writingSlug });
        let text = data?.data?.episodeBySlug?.text ?? "";
        let newDoc = Parser.makeEmptyDocForContent(url);
        util.parseHtmlAndInsertIntoContent(text, newDoc.content);
        return newDoc.dom;
    }

    static episodeSlugFromUrl(url) {
        let parts = new URL(url).pathname.split("/").filter(Boolean);
        let index = parts.indexOf("episode");
        if (index >= 0 && parts[index + 1]) {
            return parts[index + 1];
        }
        return parts[parts.length - 1] ?? "";
    }

    static writingSlugFromUrl(url) {
        let params = new URL(url).searchParams;
        return params.get("writing");
    }
}
