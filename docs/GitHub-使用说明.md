# GitHub 仓库说明

## 仓库信息（建仓时使用）

- **名称**：`before-graduation`
- **描述**：毕业之前 · 校园内容与毕业纪念平台 —— React + TypeScript + Express + SQLite 全栈课程项目（博客 / 问答 / 商城三合一）
- **可见性**：Public
- **Topics**：`react` `typescript` `express` `sqlite` `vite` `fullstack` `campus` `graduation` `course-project`

## 分支与提交

- 默认分支：`main`
- 提交按开发顺序拆分：

| 提交 | 内容 |
| --- | --- |
| `chore: 初始化 pnpm workspace 与工程配置` | 根配置、锁文件、MIT License |
| `feat(server): 用户认证与 JWT 鉴权` | 用户表、注册登录、鉴权中间件 |
| `feat(server): 文章、问答与商城的业务接口` | 12 张表、30+ REST 接口、事务扣库存 |
| `feat(server): 写入校园主题示例数据与静态资源` | 9 篇文章、7 个问题、8 件商品、灰度图片 |
| `feat(web): 搭建路由、布局与登录态` | React 19、React Router、Auth/Cart Context |
| `feat(web): 实现记录、互助、纪念与账号页面` | 17 个页面组件 |
| `style(web): 极简黑白视觉与响应式布局` | 全站样式 |
| `test: 接口冒烟测试、截图脚本与静态构建脚本` | test-api / shoot / build-static |
| `docs: README、运行截图与 Word 提交文档` | 说明文档、17 张截图、Word 提交文档 |
| `docs: 补充 AI 协作与版本管理附录` | Word 附录 A/B |
| `ci: 添加 GitHub Actions 构建检查` | typecheck + build + seed |

## 推送方式

如果本地还没有远程仓库：

```bash
# 在 GitHub 新建空仓库 before-graduation（不要勾选 README / .gitignore）
git remote add origin https://github.com/<你的用户名>/before-graduation.git
git branch -M main
git push -u origin main
```

> 本项目的 `.git` 已初始化为 `main` 分支，提交作者为 `linyi <linyi@campus.cn>`，可在推送前用
> `git commit --amend --reset-author` 改成自己的信息。

## 仓库结构

```
before-graduation/
├─ server/            Express API + SQLite + 示例数据
├─ web/               React 19 + TypeScript 前端
├─ screenshots/       17 张 1440px 运行截图
├─ docs/              AI 协作记录、GitHub 说明
├─ scripts/           接口测试、截图、静态构建、Word 生成
├─ 毕业之前-运行截图.docx
├─ README.md
└─ LICENSE
```

## CI

`.github/workflows/ci.yml` 在 push / PR 时执行：

1. `pnpm install --frozen-lockfile`
2. `pnpm -C web exec tsc --noEmit`
3. `pnpm build`
4. `pnpm seed`
