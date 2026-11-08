import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import type { CountItem, Paged, Question } from "../types";
import { formatDate, padNumber } from "../lib/format";
import { EmptyState, Loading, PageHead, Pagination, Tag } from "../components/ui";

const SORTS = [
  { key: "latest", label: "最新" },
  { key: "hot", label: "热门" },
  { key: "unsolved", label: "未解决" },
];

export default function Qa() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const sort = params.get("sort") || "latest";
  const tag = params.get("tag") || "";
  const page = Number(params.get("page") || 1);

  const [data, setData] = useState<Paged<Question> | null>(null);
  const [tags, setTags] = useState<CountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .questions({ sort, tag, page, pageSize: 8 })
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError("");
        }
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
  }, [sort, tag, page]);

  useEffect(() => {
    api.questionTags().then(setTags).catch(() => setTags([]));
  }, []);

  const update = (patch: Record<string, string | number | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null || value === "" || value === 0) next.delete(key);
      else next.set(key, String(value));
    });
    if (!("page" in patch)) next.delete("page");
    setParams(next);
  };

  const vote = async (question: Question) => {
    if (!user) {
      navigate(`/login?next=/qa/${question.id}`);
      return;
    }
    const result = await api.voteQuestion(question.id);
    setData((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) =>
              item.id === question.id
                ? { ...item, votes: result.votes, liked: result.liked }
                : item,
            ),
          }
        : current,
    );
  };

  return (
    <div className="container page">
      <PageHead
        index="02"
        latin="ANSWERS / 互助"
        title="有人问，有人答"
        description="论文、实习、租房、毕业旅行。把还没想明白的事，交给这里。"
        meta={
          <>
            <span>{data ? padNumber(data.total) : "—"} 个问题</span>
            <span className="dot" />
            <span>累计 {data ? data.items.reduce((sum, item) => sum + item.answers_count, 0) : 0} 个回答</span>
          </>
        }
        action={
          <Link to="/ask" className="btn">
            提个问题
          </Link>
        }
      />

      <div className="toolbar">
        <div className="tabs tabs--plain">
          {SORTS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={(params.get("sort") || "latest") === item.key ? "is-active" : ""}
              onClick={() => update({ sort: item.key === "latest" ? null : item.key })}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="filter-line__tags">
          <span className="filter-line__label">标签</span>
          <Tag name="全部" to="/qa" />
          {tags.slice(0, 7).map((item) => (
            <Tag key={item.name} name={item.name} to={`/qa?tag=${encodeURIComponent(item.name)}`} />
          ))}
        </div>
      </div>

      <div className="qa-layout">
        <div className="qa-main">
          {loading && <Loading label="正在整理问题" />}
          {error && <p className="form-error">{error}</p>}
          {!loading && data && data.items.length === 0 && (
            <EmptyState
              title="这个问题还没有答案"
              description="换个标签，或者自己提一个。"
              action={
                <Link to="/ask" className="btn btn--small">
                  去提问
                </Link>
              }
            />
          )}

          <ul className="question-list">
            {data?.items.map((question) => (
              <li className="question" key={question.id}>
                <button
                  type="button"
                  className={`vote ${question.liked ? "is-liked" : ""}`}
                  onClick={() => vote(question)}
                  title={question.liked ? "取消点赞" : "有用"}
                >
                  <span className="vote__arrow">▲</span>
                  <span className="vote__count">{question.votes}</span>
                </button>
                <div className="question__body">
                  <div className="question__head">
                    <Link to={`/qa/${question.id}`} className="question__title">
                      {question.title}
                    </Link>
                    {question.is_solved && <span className="badge badge--solved">已解决</span>}
                  </div>
                  <p className="question__excerpt">{question.content.replace(/\s+/g, " ").slice(0, 92)}</p>
                  <div className="question__foot">
                    <div className="question__tags">
                      {question.tags.map((item) => (
                        <Tag
                          key={item}
                          name={item}
                          to={`/qa?tag=${encodeURIComponent(item)}`}
                        />
                      ))}
                    </div>
                    <p className="question__meta">
                      {question.author.username} · {formatDate(question.created_at)} · {question.views} 次浏览
                    </p>
                  </div>
                </div>
                <div className="question__count">
                  <strong>{padNumber(question.answers_count)}</strong>
                  <span>回答</span>
                </div>
              </li>
            ))}
          </ul>

          {data && (
            <Pagination page={data.page} pages={data.pages} onChange={(next) => update({ page: next })} />
          )}
        </div>

        <aside className="qa-aside">
          <div className="aside-panel">
            <p className="eyebrow">ASK &amp; ANSWER</p>
            <h3>有问题，问出来。</h3>
            <p>提问会消耗 5 积分，回答被采纳会获得 30 积分。积分不能换钱，但能换一点被需要的错觉。</p>
            <Link to="/ask" className="btn btn--block">
              我要提问
            </Link>
          </div>
          <div className="aside-panel aside-panel--rules">
            <p className="eyebrow">POINTS</p>
            <h3>积分规则</h3>
            <ul className="rule-list">
              <li>
                <span>发布问题</span>
                <em>−5</em>
              </li>
              <li>
                <span>回答问题</span>
                <em>+10</em>
              </li>
              <li>
                <span>回答被采纳</span>
                <em>+30</em>
              </li>
              <li>
                <span>问题被点赞</span>
                <em>+5</em>
              </li>
              <li>
                <span>回答被点赞</span>
                <em>+10</em>
              </li>
            </ul>
          </div>
          <div className="aside-panel aside-panel--note">
            <p className="eyebrow">NOTE</p>
            <p className="aside-note">“回答之前，先确认自己真的想帮上忙。”</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
