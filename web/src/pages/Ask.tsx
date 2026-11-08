import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, apiErrorMessage } from "../api";
import { useAuth } from "../auth";
import { ErrorNote } from "../components/ui";

const SUGGESTED = ["论文", "求职", "租房", "毕业旅行", "考研", "校园生活"];

export default function Ask() {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const addTag = (value: string) => {
    const tag = value.replace(/^#/, "").trim();
    if (!tag || tags.includes(tag) || tags.length >= 4) return;
    setTags([...tags, tag]);
    setTagDraft("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (title.trim().length < 6) return setError("标题至少 6 个字");
    if (content.trim().length < 10) return setError("问题描述至少 10 个字");
    if (tags.length === 0) return setError("请至少添加一个标签");
    setSubmitting(true);
    try {
      const result = await api.askQuestion({ title: title.trim(), content, tags });
      await refresh();
      navigate(`/qa/${result.question.id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="container page ask-page">
      <header className="write-head">
        <div>
          <p className="eyebrow">ASK / 互助</p>
          <h1>提个问题</h1>
          <p className="write-head__desc">把问题写具体一点，答案才会具体。提问消耗 5 积分。</p>
        </div>
        <div className="write-head__meta">
          <span>积分余额 {user?.points ?? 0}</span>
        </div>
      </header>

      <div className="ask-layout">
        <form className="ask-form" onSubmit={submit}>
          <label className="field">
            <span className="field__label">问题标题</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="比如：毕业论文答辩一般会问哪些问题？"
              maxLength={80}
            />
          </label>

          <label className="field">
            <span className="field__label">问题描述</span>
            <textarea
              rows={8}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="说说你的具体情况：专业、时间、已经尝试过什么。"
            />
          </label>

          <div className="field">
            <span className="field__label">标签（最多 4 个）</span>
            <div className="tag-input">
              {tags.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  className="tag tag--removable"
                  onClick={() => setTags(tags.filter((item) => item !== tag))}
                >
                  #{tag} ×
                </button>
              ))}
              <input
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === ",") {
                    event.preventDefault();
                    addTag(tagDraft);
                  }
                }}
                placeholder="输入后按回车"
              />
            </div>
            <div className="tag-suggest">
              {SUGGESTED.filter((tag) => !tags.includes(tag)).map((tag) => (
                <button type="button" key={tag} className="tag" onClick={() => addTag(tag)}>
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {error && <ErrorNote message={error} />}

          <div className="editor__actions">
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? "发布中…" : "发布问题"}
            </button>
            <Link to="/qa" className="link-button">
              取消
            </Link>
          </div>
        </form>

        <aside className="ask-aside">
          <div className="aside-panel">
            <p className="eyebrow">HOW TO ASK</p>
            <h3>一个好问题的样子</h3>
            <ul className="rule-list rule-list--plain">
              <li>标题里写清楚具体场景，不用「求助」「急」</li>
              <li>交代背景：专业、进度、已经试过的方法</li>
              <li>一次只问一件事</li>
              <li>贴代码或截图时，注意打码个人信息</li>
            </ul>
          </div>
          <div className="aside-panel aside-panel--note">
            <p className="eyebrow">NOTE</p>
            <p className="aside-note">“问问题不丢人，问之前不搜索才有点丢人。”</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
