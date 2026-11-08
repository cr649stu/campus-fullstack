import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth";
import { Loading } from "../components/ui";

export default function NotFound() {
  return (
    <div className="container page not-found">
      <p className="eyebrow">404 / LOST</p>
      <h1>这条路走到了尽头</h1>
      <p>页面可能已经被删除，或者地址写错了。</p>
      <div className="not-found__links">
        <Link to="/" className="btn">
          回到首页
        </Link>
        <Link to="/blog" className="link-button">
          去看看记录 →
        </Link>
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="container page">
        <Loading label="正在确认身份" />
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <>{children}</>;
}
