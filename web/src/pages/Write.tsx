import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, apiErrorMessage, COVER_PRESETS } from "../api";
import { useAuth } from "../auth";
import type { Post } from "../types";
import { Markdown } from "../components/ui";

const CATEGORIES = ["校园观察", "毕业倒计时", "实习手记", "影像", "城市漫游"];

export default function Write() {
  const [params] = useSearchParams();
  const editId = params.get("id");
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [tags, setTags] = useState("");
  const [cover, setCover] = useState(COVER_PRESETS[0]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(Boolean(editId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    api
      .post(editId)
      .then(({ post }) => {
        if (cancelled) return;
        if (post.author.id !== user?.id) {
          setError("只能编辑自己的文章");
          return;
        }
        setTitle(post.title);
        setExcerpt(post.excerpt);
        setCategory(post.category);
        setTags(post.tags.join("，"));
        setCover(post.cover);
        setContent(post.content);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editId, user?.id]);

  const tagList = useMemo(
    () =>
      tags
        .split(/[,，\s]+/)
        .map((item) => item.replace(/^#/, "").trim())
        .filter(Boolean)
        .slice(0, 5),
    [tags],
  );

  const words = content.replace(/\s/g, "").length;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (title.trim().length < 4) return setError("标题至少 4 个字");
    if (content.trim().length < 20) return setError("正文至少 20 个字");
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        excerpt: excerpt.trim(),
        category,
        tags: tagList,
        cover,
        content,
      } as Partial<Post> & { tags: string[] };
      const result = editId
        ? await api.updatePost(Number(editId), payload)
        : await api.createPost(payload);
      navigate(`/blog/${result.post.id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container page">
        <p className="muted">正在打开草稿……</p>
      </div>
    );
  }

  return (
    <div className="container page write-page">
      <header className="write-head">
        <div>
          <p className="eyebrow">EDITOR / {editId ? "REVISE" : "NEW ENTRY"}</p>
          <h1>{editId ? "编辑文章" : "写一篇"}</h1>
          <p className="write-head__desc">
            用 Markdown 写作，右侧会实时看到排版效果。发布后会出现在「记录」里。
          </p>
        </div>
        <div className="write-head__meta">
          <span>{words} 字</span>
          <span>{tagList.length} 个标签</span>
        </div>
      </header>

      <form className="editor" onSubmit={submit}>
        <div className="editor__form">
          <label className="field">
            <span className="field__label">标题</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="比如：在图书馆的最后一个冬天"
              maxLength={60}
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span className="field__label">分类</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">标签（用逗号分隔，最多 5 个）</span>
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="图书馆，冬天，告别"
              />
            </label>
          </div>

          <label className="field">
            <span className="field__label">摘要（可选，不填会自动截取）</span>
            <input
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              placeholder="一句话说明这篇文章写了什么"
              maxLength={90}
            />
          </label>

          <div className="field">
            <span className="field__label">封面</span>
            <div className="cover-picker">
              {COVER_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  className={`cover-picker__item ${cover === preset ? "is-active" : ""}`}
                  onClick={() => setCover(preset)}
                  aria-label="选择封面"
                >
                  <img src={preset} alt="" />
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span className="field__label">正文（Markdown）</span>
            <textarea
              className="editor__textarea"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={"## 小标题\n\n从这里开始写。可以用 **加粗**、> 引用、- 列表。"}
              rows={18}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="editor__actions">
            <button type="submit" className="btn" disabled={saving}>
              {saving ? "保存中…" : editId ? "保存修改" : "发布文章"}
            </button>
            <button type="button" className="link-button" onClick={() => navigate(-1)}>
              取消
            </button>
          </div>
        </div>

        <aside className="editor__preview">
          <p className="eyebrow">PREVIEW</p>
          <div className="editor__preview-meta">
            <span>{category}</span>
            <span>{words} 字</span>
          </div>
          <h2 className={title ? "" : "is-placeholder"}>{title || "未命名文章"}</h2>
          <div className="editor__preview-cover">
            <img src={cover} alt="" />
          </div>
          <div className="editor__preview-body">
            {content ? (
              <Markdown content={content} />
            ) : (
              <p className="muted">在左侧输入正文，这里会实时显示排版效果。</p>
            )}
          </div>
        </aside>
      </form>
    </div>
  );
}
