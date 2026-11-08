import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../api";
import { useAuth } from "../auth";
import type { Comment, Post } from "../types";
import { formatDate, formatTime, readingMinutes } from "../lib/format";
import { Avatar, EmptyState, ErrorNote, Loading, Markdown, Tag } from "../components/ui";

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [related, setRelated] = useState<Post[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentError, setCommentError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .post(id!)
      .then(async (result) => {
        if (cancelled) return;
        setPost(result.post);
        const [commentList, relatedPage] = await Promise.all([
          api.comments(result.post.id),
          api.posts({ category: result.post.category, pageSize: 4 }),
        ]);
        if (cancelled) return;
        setComments(commentList);
        const pool = relatedPage.items.filter((item) => item.id !== result.post.id);
        if (pool.length < 3) {
          const latest = await api.posts({ pageSize: 6 });
          for (const item of latest.items) {
            if (item.id !== result.post.id && !pool.some((existing) => existing.id === item.id)) {
              pool.push(item);
            }
            if (pool.length >= 3) break;
          }
        }
        if (!cancelled) setRelated(pool.slice(0, 3));
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, user?.id]);

  const toggleLike = async () => {
    if (!user) {
      navigate(`/login?next=/blog/${id}`);
      return;
    }
    if (!post) return;
    const result = await api.likePost(post.id);
    setPost({ ...post, liked: result.liked, likes: result.likes });
  };

  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      navigate(`/login?next=/blog/${id}`);
      return;
    }
    if (draft.trim().length < 2) {
      setCommentError("评论至少 2 个字");
      return;
    }
    setSending(true);
    setCommentError("");
    try {
      const comment = await api.addComment(id!, draft.trim());
      setComments((list) => [...list, comment]);
      setDraft("");
      setPost((current) => (current ? { ...current, comments: current.comments + 1 } : current));
    } catch (err) {
      setCommentError(apiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const removeComment = async (commentId: number) => {
    if (!window.confirm("删除这条评论？")) return;
    await api.deleteComment(commentId);
    setComments((list) => list.filter((item) => item.id !== commentId));
  };

  const removePost = async () => {
    if (!post || !window.confirm("删除这篇文章？删除后无法恢复。")) return;
    await api.deletePost(post.id);
    navigate("/blog");
  };

  if (loading) {
    return (
      <div className="container page">
        <Loading label="正在展开文章" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container page">
        <EmptyState
          title="没有找到这篇文章"
          description={error || "它可能已经被删除了。"}
          action={
            <Link to="/blog" className="btn btn--small">
              回到记录
            </Link>
          }
        />
      </div>
    );
  }

  const isOwner = user?.id === post.author.id;

  return (
    <article className="article">
      <div className="container container--narrow">
        <nav className="breadcrumb">
          <Link to="/blog">记录</Link>
          <span>/</span>
          <span>{post.category}</span>
        </nav>
        <p className="article__meta">
          <span>{post.category}</span>
          <span>{formatDate(post.created_at)}</span>
          <span>{readingMinutes(post.content)} 分钟阅读</span>
        </p>
        <h1 className="article__title">{post.title}</h1>
        <p className="article__lead">{post.excerpt}</p>
        <div className="article__byline">
          <Avatar name={post.author.username} size={40} />
          <div>
            <p className="article__author">{post.author.username}</p>
            <p className="article__author-bio">{post.author.bio || "「毕业之前」写作者"}</p>
          </div>
          <div className="article__byline-right">
            <span>{post.views} 次阅读</span>
            <span>{post.comments} 条评论</span>
          </div>
        </div>
      </div>

      <figure className="article__cover">
        <img src={post.cover} alt={post.title} />
      </figure>

      <div className="container container--narrow">
        <Markdown content={post.content} />

        <div className="article__tags">
          {post.tags.map((tag) => (
            <Tag key={tag} name={tag} to={`/blog?tag=${encodeURIComponent(tag)}`} />
          ))}
        </div>

        <div className="article__actions">
          <button
            type="button"
            className={`like-button ${post.liked ? "is-liked" : ""}`}
            onClick={toggleLike}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill={post.liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4">
              <path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 3c0 5.4-7.5 10-7.5 10Z" />
            </svg>
            {post.liked ? "已赞" : "点赞"} <em>{post.likes}</em>
          </button>
          {isOwner && (
            <div className="article__owner-actions">
              <Link to={`/write?id=${post.id}`} className="link-button">
                编辑
              </Link>
              <button type="button" className="link-button" onClick={removePost}>
                删除
              </button>
            </div>
          )}
        </div>

        <section className="comments" id="comments">
          <div className="comments__head">
            <h2>评论</h2>
            <span>{comments.length} 条</span>
          </div>

          {comments.length === 0 && <p className="comments__empty">还没有人说话，来坐第一排。</p>}

          <ul className="comment-list">
            {comments.map((comment) => (
              <li className="comment" key={comment.id}>
                <Avatar name={comment.user.username} size={34} variant="outline" />
                <div className="comment__body">
                  <div className="comment__head">
                    <span className="comment__name">{comment.user.username}</span>
                    <span className="comment__time">{formatTime(comment.created_at)}</span>
                    {user && (user.id === comment.user.id || isOwner) && (
                      <button
                        type="button"
                        className="comment__delete"
                        onClick={() => removeComment(comment.id)}
                      >
                        删除
                      </button>
                    )}
                  </div>
                  <p>{comment.content}</p>
                </div>
              </li>
            ))}
          </ul>

          <form className="comment-form" onSubmit={submitComment}>
            <p className="comment-form__label">
              {user ? `以 ${user.username} 的身份留言` : "登录后参与讨论"}
            </p>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={user ? "写下你的想法……" : "登录后就可以留言了"}
              rows={4}
              disabled={!user}
            />
            {commentError && <ErrorNote message={commentError} />}
            <div className="comment-form__foot">
              <span>请友善发言，评论最多 500 字。</span>
              {user ? (
                <button type="submit" className="btn btn--small" disabled={sending}>
                  {sending ? "发送中…" : "发表评论"}
                </button>
              ) : (
                <Link to={`/login?next=/blog/${post.id}`} className="btn btn--small">
                  去登录
                </Link>
              )}
            </div>
          </form>
        </section>
      </div>

      {related.length > 0 && (
        <section className="related">
          <div className="container">
            <div className="section-head">
              <div className="section-head__left">
                <span className="section-head__index">→</span>
                <div>
                  <p className="eyebrow">KEEP READING</p>
                  <h2>继续阅读</h2>
                </div>
              </div>
            </div>
            <div className="related__grid">
              {related.map((item) => (
                <Link to={`/blog/${item.id}`} className="related__item" key={item.id}>
                  <img src={item.cover} alt={item.title} loading="lazy" />
                  <p className="related__meta">{item.category}</p>
                  <h3>{item.title}</h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
