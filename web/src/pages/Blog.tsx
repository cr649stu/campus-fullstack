import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";
import type { CountItem, Paged, Post } from "../types";
import { formatDate, padNumber } from "../lib/format";
import { EmptyState, Loading, PageHead, Pagination, Tag } from "../components/ui";

export default function Blog() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "";
  const tag = params.get("tag") || "";
  const keyword = params.get("keyword") || "";
  const sort = params.get("sort") === "hot" ? "hot" : "latest";
  const page = Number(params.get("page") || 1);

  const [data, setData] = useState<Paged<Post> | null>(null);
  const [categories, setCategories] = useState<CountItem[]>([]);
  const [tags, setTags] = useState<CountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(keyword);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(keyword);
  }, [keyword]);

  useEffect(() => {
    if (params.get("focus") === "search") {
      searchRef.current?.focus();
    }
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .posts({ category, tag, keyword, sort, page, pageSize: 9 })
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError("");
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "载入失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, tag, keyword, sort, page]);

  useEffect(() => {
    api.postCategories().then(setCategories).catch(() => setCategories([]));
    api.postTags().then(setTags).catch(() => setTags([]));
  }, []);

  const update = (patch: Record<string, string | number | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null || value === "" || value === 0) next.delete(key);
      else next.set(key, String(value));
    });
    if (!("page" in patch)) next.delete("page");
    next.delete("focus");
    setParams(next);
  };

  return (
    <div className="container page">
      <PageHead
        index="01"
        latin="JOURNAL / 记录"
        title="校园记录"
        description="课后的走廊、深夜的食堂、最后一次班会。把还记得的部分写下来。"
        meta={
          <>
            <span>{data ? padNumber(data.total) : "—"} 篇文章</span>
            <span className="dot" />
            <span>更新至 2026.10</span>
          </>
        }
        action={
          <Link to="/write" className="btn">
            写一篇
          </Link>
        }
      />

      <div className="toolbar">
        <div className="tabs">
          <button
            type="button"
            className={!category ? "is-active" : ""}
            onClick={() => update({ category: null })}
          >
            全部
          </button>
          {categories.map((item) => (
            <button
              key={item.name}
              type="button"
              className={category === item.name ? "is-active" : ""}
              onClick={() => update({ category: item.name })}
            >
              {item.name}
              <em>{item.count}</em>
            </button>
          ))}
        </div>
        <form
          className="search"
          onSubmit={(event) => {
            event.preventDefault();
            update({ keyword: draft.trim() || null });
          }}
        >
          <input
            ref={searchRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="搜索标题、摘要或正文"
            aria-label="搜索文章"
          />
          <button type="submit" aria-label="搜索">
            →
          </button>
        </form>
      </div>

      <div className="filter-line">
        <div className="filter-line__tags">
          <span className="filter-line__label">标签</span>
          <Tag name="全部" to="/blog" />
          {tags.slice(0, 8).map((item) => (
            <Tag
              key={item.name}
              name={item.name}
              to={`/blog?tag=${encodeURIComponent(item.name)}`}
            />
          ))}
        </div>
        <div className="sort">
          <button
            type="button"
            className={sort === "latest" ? "is-active" : ""}
            onClick={() => update({ sort: null })}
          >
            最新
          </button>
          <span>/</span>
          <button
            type="button"
            className={sort === "hot" ? "is-active" : ""}
            onClick={() => update({ sort: "hot" })}
          >
            最热
          </button>
        </div>
      </div>

      {loading && <Loading label="正在翻找记录" />}
      {error && <p className="form-error">{error}</p>}

      {!loading && data && data.items.length === 0 && (
        <EmptyState
          title="这里还没有文字"
          description="换一个关键词，或者成为第一个写下它的人。"
          action={
            <Link to="/write" className="btn btn--small">
              开始写
            </Link>
          }
        />
      )}

      {!loading && data && data.items.length > 0 && (
        <>
          <div className="post-grid">
            {data.items.map((post) => (
              <article className="post-card" key={post.id}>
                <Link to={`/blog/${post.id}`} className="post-card__media">
                  <img src={post.cover} alt={post.title} loading="lazy" />
                </Link>
                <div className="post-card__body">
                  <p className="post-card__meta">
                    <span>{post.category}</span>
                    <span>{formatDate(post.created_at)}</span>
                  </p>
                  <h2>
                    <Link to={`/blog/${post.id}`}>{post.title}</Link>
                  </h2>
                  <p className="post-card__excerpt">{post.excerpt}</p>
                  <div className="post-card__foot">
                    <span>{post.author.username}</span>
                    <span>阅读 {post.views}</span>
                    <span>赞 {post.likes}</span>
                    <span>评论 {post.comments}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <Pagination
            page={data.page}
            pages={data.pages}
            onChange={(next) => update({ page: next })}
          />
        </>
      )}
    </div>
  );
}
