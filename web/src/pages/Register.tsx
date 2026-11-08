import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiErrorMessage } from "../api";
import { useAuth } from "../auth";
import { ErrorNote } from "../components/ui";

export default function Register() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const next = params.get("next") || "/";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (username.trim().length < 2) return setError("用户名至少 2 个字符");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("邮箱格式不正确");
    if (password.length < 6) return setError("密码至少 6 位");
    if (password !== confirm) return setError("两次输入的密码不一致");
    setSubmitting(true);
    try {
      await register(username.trim(), email.trim(), password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth__panel auth__panel--alt">
        <img src="/static/covers/campus.jpg" alt="校园草坪与教学楼" />
        <div className="auth__panel-copy">
          <p className="eyebrow">A PLACE TO KEEP</p>
          <p>“在离开之前，把还能记住的部分留下来。”</p>
          <span>2026 · 毕业季</span>
        </div>
      </div>

      <div className="auth__form">
        <Link to="/" className="auth__brand">
          毕业之前 <span>BEFORE GRADUATION</span>
        </Link>
        <h1>创建账号</h1>
        <p className="auth__lead">注册之后，你会得到自己的文章页、购物袋和积分。</p>

        <form onSubmit={submit}>
          <label className="field">
            <span className="field__label">用户名</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="2–20 个字符"
              maxLength={20}
            />
          </label>
          <label className="field">
            <span className="field__label">邮箱</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@campus.cn"
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span className="field__label">密码</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 6 位"
              />
            </label>
            <label className="field">
              <span className="field__label">确认密码</span>
              <input
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="再输入一次"
              />
            </label>
          </div>
          {error && <ErrorNote message={error} />}
          <button type="submit" className="btn btn--block" disabled={submitting}>
            {submitting ? "创建中…" : "注册并登录"}
          </button>
        </form>

        <p className="auth__switch">
          已经有账号？<Link to={`/login?next=${encodeURIComponent(next)}`}>直接登录</Link>
        </p>
      </div>
    </div>
  );
}
