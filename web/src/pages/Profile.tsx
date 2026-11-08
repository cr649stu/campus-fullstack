import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import type { MyStats } from "../types";
import { formatDate, padNumber } from "../lib/format";
import { Avatar, EmptyState, Loading } from "../components/ui";

export default function Profile() {
  const { user } = useAuth();
  const [stats, setStats] = useState<MyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .myStats()
      .then((result) => {
        if (!cancelled) setStats(result);
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
  }, [user?.id]);

  if (!user) return null;

  return (
    <div className="container page">
      <header className="profile-head">
        <Avatar name={user.username} size={76} />
        <div className="profile-head__body">
          <p className="eyebrow">MEMBER SINCE 2022</p>
          <h1>{user.username}</h1>
          <p className="profile-head__bio">{user.bio}</p>
          <p className="profile-head__meta">
            {user.email} · {user.points} 积分
          </p>
        </div>
        <div className="profile-head__actions">
          <Link to="/write" className="btn">
            写新文章
          </Link>
          <Link to="/ask" className="btn btn--outline">
            提个问题
          </Link>
        </div>
      </header>

      {loading && <Loading label="正在整理你的记录" />}
      {error && <p className="form-error">{error}</p>}

      {stats && (
        <>
          <dl className="stat-grid">
            <div>
              <dt>文章</dt>
              <dd>{padNumber(stats.posts)}</dd>
            </div>
            <div>
              <dt>总阅读</dt>
              <dd>{stats.views}</dd>
            </div>
            <div>
              <dt>获赞</dt>
              <dd>{stats.likes}</dd>
            </div>
            <div>
              <dt>回答</dt>
              <dd>{padNumber(stats.answers)}</dd>
            </div>
            <div>
              <dt>评论</dt>
              <dd>{padNumber(stats.comments)}</dd>
            </div>
            <div>
              <dt>积分</dt>
              <dd>{stats.points}</dd>
            </div>
          </dl>

          <section className="profile-section">
            <div className="section-head">
              <div className="section-head__left">
                <span className="section-head__index">01</span>
                <div>
                  <p className="eyebrow">MY STORIES</p>
                  <h2>我写过的</h2>
                </div>
              </div>
              <Link to="/blog" className="arrow-link">
                全部记录 <span aria-hidden="true">→</span>
              </Link>
            </div>

            {stats.recentPosts.length === 0 ? (
              <EmptyState
                title="还没有写过文章"
                description="从一篇短文开始，记录今天的校园。"
                action={
                  <Link to="/write" className="btn btn--small">
                    去写第一篇
                  </Link>
                }
              />
            ) : (
              <ul className="profile-posts">
                {stats.recentPosts.map((post) => (
                  <li key={post.id}>
                    <Link to={`/blog/${post.id}`} className="profile-posts__title">
                      {post.title}
                    </Link>
                    <span className="profile-posts__meta">
                      {post.category} · {formatDate(post.created_at)} · {post.views} 阅读 · {post.likes} 赞
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
