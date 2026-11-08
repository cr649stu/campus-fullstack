import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth";
import { useCart } from "../cart";
import { Avatar } from "./ui";

function Header() {
  const { user, logout } = useAuth();
  const { cart } = useCart();

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand">
          <span className="brand__cn">毕业之前</span>
          <span className="brand__en">BEFORE GRADUATION</span>
        </Link>

        <nav className="site-nav">
          <NavLink to="/blog" className={({ isActive }) => (isActive ? "is-active" : "")}>
            记录
          </NavLink>
          <NavLink to="/qa" className={({ isActive }) => (isActive ? "is-active" : "")}>
            互助
          </NavLink>
          <NavLink to="/shop" className={({ isActive }) => (isActive ? "is-active" : "")}>
            纪念
          </NavLink>
        </nav>

        <div className="site-actions">
          <Link to="/blog?focus=search" className="icon-link" aria-label="搜索">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4.5 4.5" />
            </svg>
          </Link>
          <Link to="/cart" className="icon-link icon-link--bag" aria-label="购物袋">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M5 8h14l-1 12H6L5 8Z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            {cart.count > 0 && <em className="bag-count">{cart.count}</em>}
          </Link>
          {user ? (
            <div className="user-chip">
              <Link to="/profile" className="user-chip__link">
                <Avatar name={user.username} size={26} />
                <span>{user.username}</span>
              </Link>
              <button type="button" className="link-button" onClick={logout}>
                退出
              </button>
            </div>
          ) : (
            <Link to="/login" className="nav-login">
              登录
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <p className="site-footer__title">毕业之前</p>
          <p className="site-footer__en">BEFORE GRADUATION</p>
          <p className="site-footer__desc">
            把校园里最后一段日子，写成文章、问出问题、留下一件可以带走的东西。
          </p>
        </div>
        <div className="site-footer__col">
          <p className="site-footer__label">目录</p>
          <Link to="/blog">记录 / Journal</Link>
          <Link to="/qa">互助 / Answers</Link>
          <Link to="/shop">纪念 / Objects</Link>
          <Link to="/write">写文章</Link>
        </div>
        <div className="site-footer__col">
          <p className="site-footer__label">关于</p>
          <span>课程练习项目 · 全栈开发</span>
          <span>React + Express + SQLite</span>
          <span>演示账号 linyi@campus.cn</span>
          <span>密码 123456</span>
        </div>
      </div>
      <div className="site-footer__bottom">
        <span>© 2026 毕业之前 · 非商业课程作品</span>
        <span>Made for the last days on campus</span>
      </div>
    </footer>
  );
}

export default function Layout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  return (
    <div className="app">
      <Header />
      <main className="app-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
