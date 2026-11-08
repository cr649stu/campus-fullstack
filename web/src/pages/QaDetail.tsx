import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../api";
import { useAuth } from "../auth";
import type { Answer, Question, QuestionDetail } from "../types";
import { formatTime } from "../lib/format";
import { Avatar, ErrorNote, Loading, Markdown, Tag } from "../components/ui";

export default function QaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [detail, setDetail] = useState<QuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answerDraft, setAnswerDraft] = useState("");
  const [answerError, setAnswerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () =>
    api
      .question(id!)
      .then((result) => {
        setDetail(result);
        setError("");
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));

  useEffect(() => {
    setLoading(true);
    load();
  }, [id, user?.id]);

  const voteQuestion = async () => {
    if (!user) return navigate(`/login?next=/qa/${id}`);
    if (!detail) return;
    const result = await api.voteQuestion(detail.question.id);
    setDetail({
      ...detail,
      question: { ...detail.question, liked: result.liked, votes: result.votes },
    });
  };

  const voteAnswer = async (answer: Answer) => {
    if (!user) return navigate(`/login?next=/qa/${id}`);
    if (!detail) return;
    const result = await api.voteAnswer(answer.id);
    setDetail({
      ...detail,
      answers: detail.answers.map((item) =>
        item.id === answer.id ? { ...item, liked: result.liked, votes: result.votes } : item,
      ),
    });
  };

  const accept = async (answer: Answer) => {
    if (!window.confirm("采纳这个回答？采纳后问题会标记为已解决。")) return;
    await api.acceptAnswer(answer.id);
    await load();
  };

  const submitAnswer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return navigate(`/login?next=/qa/${id}`);
    if (answerDraft.trim().length < 10) {
      setAnswerError("回答至少 10 个字");
      return;
    }
    setSubmitting(true);
    setAnswerError("");
    try {
      await api.answerQuestion(id!, answerDraft.trim());
      setAnswerDraft("");
      await load();
    } catch (err) {
      setAnswerError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container page">
        <Loading label="正在展开讨论" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="container page">
        <p className="form-error">{error || "问题不存在"}</p>
        <Link to="/qa" className="arrow-link">
          回到互助区 →
        </Link>
      </div>
    );
  }

  const question = detail.question;
  const isOwner = user?.id === question.author.id;
  const accepted = detail.answers.find((answer) => answer.is_accepted);

  return (
    <div className="container page">
      <nav className="breadcrumb">
        <Link to="/qa">互助</Link>
        <span>/</span>
        <span>{question.tags[0] || "问题"}</span>
      </nav>

      <div className="qa-detail">
        <div className="qa-detail__main">
          <header className="qa-question">
            <div className="qa-question__head">
              <div>
                <p className="qa-question__meta">
                  <span>提问</span>
                  <span>{formatTime(question.created_at)}</span>
                  <span>{question.views} 次浏览</span>
                </p>
                <h1>{question.title}</h1>
              </div>
              <button
                type="button"
                className={`vote vote--large ${question.liked ? "is-liked" : ""}`}
                onClick={voteQuestion}
              >
                <span className="vote__arrow">▲</span>
                <span className="vote__count">{question.votes}</span>
                <span className="vote__label">有用</span>
              </button>
            </div>

            <div className="qa-question__tags">
              {question.tags.map((tag) => (
                <Tag key={tag} name={tag} to={`/qa?tag=${encodeURIComponent(tag)}`} />
              ))}
              {question.is_solved && <span className="badge badge--solved">已解决</span>}
            </div>

            <div className="qa-question__body">
              <Markdown content={question.content} />
            </div>

            <div className="qa-question__author">
              <Avatar name={question.author.username} size={34} variant="outline" />
              <span>{question.author.username}</span>
              <span className="muted">提问者</span>
            </div>
          </header>

          <section className="answers">
            <div className="answers__head">
              <h2>
                {question.answers_count} 个回答
                {accepted && <span className="answers__accepted">已有采纳</span>}
              </h2>
              {!question.is_solved && isOwner && <span className="muted">你可以采纳其中一个回答</span>}
            </div>

            {detail.answers.length === 0 && (
              <p className="answers__empty">还没有人回答。如果你知道答案，往下写。</p>
            )}

            <ul className="answer-list">
              {detail.answers.map((answer) => (
                <li
                  className={`answer ${answer.is_accepted ? "is-accepted" : ""}`}
                  key={answer.id}
                >
                  {answer.is_accepted && <span className="answer__ribbon">已采纳</span>}
                  <div className="answer__side">
                    <button
                      type="button"
                      className={`vote ${answer.liked ? "is-liked" : ""}`}
                      onClick={() => voteAnswer(answer)}
                    >
                      <span className="vote__arrow">▲</span>
                      <span className="vote__count">{answer.votes}</span>
                    </button>
                  </div>
                  <div className="answer__body">
                    <Markdown content={answer.content} />
                    <div className="answer__foot">
                      <div className="answer__author">
                        <Avatar name={answer.author.username} size={28} variant="outline" />
                        <span>{answer.author.username}</span>
                        <span className="muted">{formatTime(answer.created_at)}</span>
                      </div>
                      {isOwner && !question.is_solved && !answer.is_accepted && (
                        <button type="button" className="link-button" onClick={() => accept(answer)}>
                          采纳这个回答
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <form className="answer-form" onSubmit={submitAnswer}>
              <h3>写下你的回答</h3>
              <textarea
                rows={6}
                value={answerDraft}
                onChange={(event) => setAnswerDraft(event.target.value)}
                placeholder={user ? "尽量具体一点，比如你亲身经历的做法……" : "登录后即可回答"}
                disabled={!user}
              />
              {answerError && <ErrorNote message={answerError} />}
              <div className="answer-form__foot">
                <span>回答获得 10 积分，被采纳再加 30 积分。</span>
                {user ? (
                  <button type="submit" className="btn btn--small" disabled={submitting}>
                    {submitting ? "发布中…" : "发布回答"}
                  </button>
                ) : (
                  <Link to={`/login?next=/qa/${question.id}`} className="btn btn--small">
                    登录后回答
                  </Link>
                )}
              </div>
            </form>
          </section>
        </div>

        <aside className="qa-detail__aside">
          <div className="aside-panel">
            <p className="eyebrow">ASKER</p>
            <div className="asker">
              <Avatar name={question.author.username} size={44} />
              <div>
                <p className="asker__name">{question.author.username}</p>
                <p className="asker__meta">提问于 {formatTime(question.created_at)}</p>
              </div>
            </div>
            <Link to="/ask" className="btn btn--block btn--outline">
              我也想问
            </Link>
          </div>
          <div className="aside-panel aside-panel--note">
            <p className="eyebrow">ETIQUETTE</p>
            <ul className="rule-list rule-list--plain">
              <li>先搜索有没有相似问题</li>
              <li>标题写清楚，别只写「求助」</li>
              <li>得到帮助后，记得回来说一声谢谢</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
