import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiErrorMessage } from "../api";
import { useAuth } from "../auth";
import { ErrorNote } from "../components/ui";

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const next = params.get("next") || "/";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!account.trim() || !password) return setError("请输入账号和密码");
    setSubmitting(true);
    try {
      await login(account.trim(), password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
      setSubmitting(false);
    }
  };

  const fillDemo = () => {
    setAccount("linyi@campus.cn");
    setPassword("123456");
  };

  return (
    <div className="auth">
      <div className="auth__panel">
        <img src="/static/covers/architecture.jpg" alt="校园建筑" />
        <div className="auth__panel-copy">
          <p className="eyebrow">BEFORE GRADUATION</p>
          <p>“最后一次以学生的身份，走进这栋楼。”</p>
          <span>2026 · 毕业季</span>
        </div>
      </div>

      <div className="auth__form">
        <Link to="/" className="auth__brand">
          毕业之前 <span>BEFORE GRADUATION</span>
        </Link>
        <h1>欢迎回来</h1>
        <p className="auth__lead">登录后可以写文章、提问、把纪念品放进购物袋。</p>

        <form onSubmit={submit}>
          <label className="field">
            <span className="field__label">账号</span>
            <input
              value={account}
              onChange={(event) => setAccount(event.target.value)}
              placeholder="用户名或邮箱"
              autoComplete="username"
            />
          </label>
          <label className="field">
            <span className="field__label">密码</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="至少 6 位"
              autoComplete="current-password"
            />
          </label>
          {error && <ErrorNote message={error} />}
          <button type="submit" className="btn btn--block" disabled={submitting}>
            {submitting ? "登录中…" : "登录"}
          </button>
        </form>

        <div className="auth__demo">
          <span>演示账号</span>
          <code>linyi@campus.cn / 123456</code>
          <button type="button" className="link-button" onClick={fillDemo}>
            填入
          </button>
        </div>

        <p className="auth__switch">
          还没有账号？<Link to={`/register?next=${encodeURIComponent(next)}`}>注册一个</Link>
        </p>
      </div>
    </div>
  );
}
