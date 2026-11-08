# 部署说明

「毕业之前」是 React 静态前端 + Express 接口 + SQLite 的单进程应用。前端打包后由 Express 一起托管，所以**只需要一个能跑 Node 24 的地方**。

- 只想在作品集里展示：用 `personal-site/works-before-graduation.html`，不需要部署后端。
- 想给访客一个可点的在线 Demo：按下面任一方式部署，再把链接加到作品页。

## 方案一：VPS + Docker（推荐，有服务器和域名时）

服务器要求：1 核 1G 内存即可，装好 Docker 与 Docker Compose。

```bash
# 本地打包上传（在项目上一级目录执行）
scp -r campus-fullstack user@your-server:/opt/

# 登录服务器
ssh user@your-server
cd /opt/campus-fullstack/deploy

# 改一下 JWT_SECRET，再启动
docker compose up -d --build

# 检查
curl http://127.0.0.1:8787/api/health
```

默认监听 `8787`，SQLite 数据落在 `deploy/data/app.db`，重建容器不会丢。

Nginx 反向代理（`deploy/nginx.conf.example`）：

```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/before-graduation
sudo ln -s /etc/nginx/sites-available/before-graduation /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d demo.example.com
```

然后把作品页里的「查看源码」旁边加一个在线 Demo 链接：

```html
<a class="project-btn" href="https://demo.example.com" target="_blank" rel="noopener">在线演示 →</a>
```

## 方案二：Render / Railway（没有服务器时）

1. 把项目推到 GitHub（或先用 Render 的 public Git URL）。
2. 新建 Web Service，选择 Docker：
   - Dockerfile：`deploy/Dockerfile`
   - 环境变量：`HOST=0.0.0.0`、`JWT_SECRET=随机长字符串`
   - 添加持久磁盘，挂载到 `/app/server/data`
3. 部署完成后拿到 `https://xxx.onrender.com`，填到作品页。

> 注意：免费实例会休眠，首次访问要等几十秒；SQLite 必须挂持久磁盘，否则重启后数据重置。

## 方案三：只交作品集页面（最省事）

`personal-site/` 是纯静态站，直接上传到 GitHub Pages 即可，不需要后端：

1. 打开 `https://github.com/CR649STU/cr649stu.github.io/upload/main`
2. 上传 `works-before-graduation.html`、`project.css`，以及 `assets/before-graduation/` 整个文件夹
3. `works.html` 已加好「查看项目详情 →」，等 1–2 分钟访问：
   `https://cr649stu.github.io/works-before-graduation.html`

## 环境变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | 容器里必须设为 `0.0.0.0` |
| `PORT` | `8787` | 监听端口 |
| `JWT_SECRET` | 本地开发默认值 | 生产必须改成随机长字符串 |
| `DB_FILE` | `server/data/app.db` | SQLite 文件路径 |

## 数据备份

```bash
# 备份
docker compose exec app sh -c 'cp /app/server/data/app.db /app/server/data/backup-$(date +%F).db'
docker cp before-graduation-app-1:/app/server/data/backup-2026-11-07.db ./
```

## 常见问题

- **页面能打开但接口 404**：确认 `web/dist` 已构建，且 Express 是同一个进程在跑。
- **容器里 502**：`HOST` 没设成 `0.0.0.0`，进程只监听了容器内的 127.0.0.1。
- **重启后数据没了**：没有挂载 `/app/server/data`。
- **Node 版本**：`node:sqlite` 需要 Node ≥ 22.5，镜像已用 24。
