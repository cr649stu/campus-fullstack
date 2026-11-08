import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { Post, Product, Question, SiteStats } from "../types";
import { formatDate, formatPrice, padNumber } from "../lib/format";
import { EmptyState, Loading, SectionHead } from "../components/ui";

export default function Home() {
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.siteStats(),
      api.posts({ pageSize: 3, sort: "latest" }),
      api.questions({ sort: "hot", pageSize: 3 }),
      api.products(),
    ])
      .then(([site, postPage, questionPage, productList]) => {
        if (cancelled) return;
        setStats(site);
        setPosts(postPage.items);
        setQuestions(questionPage.items);
        setProducts(productList.slice(0, 4));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "载入失败");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <section className="hero">
        <img className="hero__image" src="/static/covers/hero.jpg" alt="毕业典礼上抛起的学士帽" />
        <div className="hero__veil" />
        <div className="container hero__inner">
          <p className="hero__eyebrow">VOL.04 / 2026 毕业季特辑</p>
          <h1 className="hero__title">
            把毕业之前的日子，
            <br />
            留在这里。
          </h1>
          <p className="hero__lead">
            记录、提问、带走一件纪念品。
            <br />
            这是属于我们最后一年的校园档案。
          </p>
          <div className="hero__actions">
            <Link to="/blog" className="btn btn--light">
              开始记录
            </Link>
            <Link to="/shop" className="btn btn--ghost">
              逛逛纪念品
            </Link>
          </div>
          <dl className="hero__stats">
            <div>
              <dt>文章</dt>
              <dd>{padNumber(stats?.posts ?? 0)}</dd>
            </div>
            <div>
              <dt>问题</dt>
              <dd>{padNumber(stats?.questions ?? 0)}</dd>
            </div>
            <div>
              <dt>纪念品</dt>
              <dd>{padNumber(stats?.products ?? 0)}</dd>
            </div>
            <div>
              <dt>写作者</dt>
              <dd>{padNumber(stats?.users ?? 0)}</dd>
            </div>
          </dl>
        </div>
        <span className="hero__vertical">SINCE 2019 — 2026</span>
      </section>

      <section className="container entries">
        <Link to="/blog" className="entry">
          <div className="entry__media">
            <img src="/static/covers/library.jpg" alt="图书馆书架" />
            <span className="entry__index">01</span>
          </div>
          <div className="entry__body">
            <p className="eyebrow">JOURNAL</p>
            <h3>记录</h3>
            <p>写下课后的走廊、食堂的夜宵，和那些不好意思说出口的告别。</p>
            <span className="entry__arrow">进入栏目 →</span>
          </div>
        </Link>
        <Link to="/qa" className="entry">
          <div className="entry__media">
            <img src="/static/covers/team.jpg" alt="同学们围坐讨论" />
            <span className="entry__index">02</span>
          </div>
          <div className="entry__body">
            <p className="eyebrow">ANSWERS</p>
            <h3>互助</h3>
            <p>论文、实习、租房、毕业旅行——把困惑留在这里，总有人答得上来。</p>
            <span className="entry__arrow">进入栏目 →</span>
          </div>
        </Link>
        <Link to="/shop" className="entry">
          <div className="entry__media">
            <img src="/static/covers/notebook.jpg" alt="摊开的笔记本与钢笔" />
            <span className="entry__index">03</span>
          </div>
          <div className="entry__body">
            <p className="eyebrow">OBJECTS</p>
            <h3>纪念</h3>
            <p>相机、纪念册、明信片。把四年装进一件可以带走的东西里。</p>
            <span className="entry__arrow">进入栏目 →</span>
          </div>
        </Link>
      </section>

      <section className="container home-journal">
        <SectionHead index={1} latin="LATEST STORIES" title="最新记录" link="/blog" />
        {error && <p className="form-error">{error}</p>}
        {!stats && !error && <Loading />}
        <div className="home-journal__grid">
          <div className="home-journal__list">
            {posts.map((post) => (
              <Link to={`/blog/${post.id}`} className="post-row" key={post.id}>
                <div className="post-row__media">
                  <img src={post.cover} alt={post.title} />
                </div>
                <div className="post-row__body">
                  <p className="post-row__meta">
                    <span>{post.category}</span>
                    <span>{formatDate(post.created_at)}</span>
                  </p>
                  <h3>{post.title}</h3>
                  <p className="post-row__excerpt">{post.excerpt}</p>
                  <p className="post-row__foot">
                    {post.author.username} · {post.views} 次阅读 · {post.comments} 条评论
                  </p>
                </div>
              </Link>
            ))}
            {!posts.length && !error && stats && (
              <EmptyState title="还没有文章" description="成为第一个留下记录的人。" />
            )}
          </div>

          <aside className="home-aside">
            <div className="aside-block">
              <p className="eyebrow">DISCUSSING</p>
              <h3 className="aside-block__title">正在讨论</h3>
              <ol className="aside-questions">
                {questions.map((question, index) => (
                  <li key={question.id}>
                    <Link to={`/qa/${question.id}`}>
                      <span className="aside-questions__num">{padNumber(index + 1)}</span>
                      <span className="aside-questions__title">{question.title}</span>
                      <span className="aside-questions__meta">
                        {question.answers_count} 个回答 · {question.votes} 票
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
              <Link to="/qa" className="arrow-link arrow-link--small">
                去互助区 <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="aside-quote">
              <p>“有些人，是最后一次在同一个教室里见面。”</p>
              <span>—— 摘自《毕业倒计时 100 天》</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="home-objects">
        <div className="container">
          <SectionHead index={3} latin="OBJECTS TO KEEP" title="带走一件纪念" link="/shop" />
          <div className="product-strip">
            {products.map((product) => (
              <Link to={`/shop/${product.id}`} className="product-strip__item" key={product.id}>
                <div className="product-strip__media">
                  <img src={product.image} alt={product.name} />
                </div>
                <p className="product-strip__name">{product.name}</p>
                <p className="product-strip__price">{formatPrice(product.price)}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="home-statement">
        <div className="container">
          <p className="eyebrow">ABOUT THIS PLACE</p>
          <p className="home-statement__text">
            四年里，我们在这里借过书、问过路、爱过几个人。
            <br />
            在离开之前，把还能记住的部分，留下来。
          </p>
          <Link to="/write" className="arrow-link">
            写下你的第一篇 <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </>
  );
}
