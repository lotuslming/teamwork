# TeamWork 离线部署说明

本文档面向内网/离线环境，统一说明 TeamWork 主应用、本地 AI 服务、OnlyOffice Document Server 的部署方式与配置关系。

当前版本已内置离线兜底逻辑：

- 未配置本地大模型接口时，项目问答与总结自动退回本地规则分析模式。
- OnlyOffice 容器未启动或健康检查失败时，Office 文件自动退回内置轻量编辑/预览模式。
- 可通过 `GET /api/runtime-capabilities`、`GET /health`、`GET /ready` 查看当前能力状态。

## 1. 部署拓扑

项目运行时有三条关键链路：

1. 浏览器访问 TeamWork Web：由用户浏览器访问 TeamWork 应用地址，例如 `http://<host>:5000`。
2. 浏览器加载 OnlyOffice 编辑器：前端会读取 `ONLYOFFICE_URL`，由浏览器直接访问 OnlyOffice 页面资源。
3. OnlyOffice 回调 TeamWork：OnlyOffice 容器会通过 `INTERNAL_URL` 回调 TeamWork 下载文件、回写文档。

因此有 3 个变量必须成组理解：

| 变量 | 谁使用 | 作用 |
|---|---|---|
| `ONLYOFFICE_URL` | 浏览器 / 前端 | 用户打开文档时访问的 OnlyOffice 地址 |
| `ONLYOFFICE_JWT_SECRET` | TeamWork + OnlyOffice | 双方 JWT 必须完全一致 |
| `INTERNAL_URL` | OnlyOffice 容器 | OnlyOffice 用来访问 TeamWork 的内网地址 |

本地 AI 服务同理，核心是让 TeamWork 进程能访问到一个兼容 OpenAI API 的服务：

| 变量 | 作用 |
|---|---|
| `OPENAI_API_BASE` | OpenAI 兼容接口地址，例如 `http://127.0.0.1:11434/v1` |
| `OPENAI_API_KEY` | 访问密钥；部分本地服务可填写任意非空值 |
| `OPENAI_MODEL` | 实际调用的模型名 |

## 2. 离线环境准备

至少准备以下资源：

- Python 3.9+ 运行环境
- `pip` 和 `venv`
- Docker Engine + Docker Compose Plugin（OnlyOffice 依赖）
- 项目源码包
- Python 依赖离线包，建议提前导出为 `wheelhouse/`
- OnlyOffice 镜像包，建议提前准备 `onlyoffice/documentserver:latest`

如果服务器完全断网，建议在有网机器先准备：

```bash
pip download -r requirements.txt -d wheelhouse
docker pull onlyoffice/documentserver:latest
docker save onlyoffice/documentserver:latest -o onlyoffice-documentserver.tar
```

将源码、`wheelhouse/`、`onlyoffice-documentserver.tar` 一并拷贝到目标服务器。

## 3. 推荐目录结构

```text
/opt/teamwork/
├── app.py
├── config.py
├── requirements.txt
├── wheelhouse/
├── uploads/
├── instance/
├── docs/
└── .env
```

## 4. 应用离线安装

### 4.1 创建虚拟环境

```bash
cd /opt/teamwork
python3 -m venv .venv
source .venv/bin/activate
```

### 4.2 安装 Python 依赖

有内网 PyPI 镜像时：

```bash
pip install -r requirements.txt
```

严格离线时：

```bash
pip install --no-index --find-links ./wheelhouse -r requirements.txt
```

### 4.3 初始化目录与数据库

```bash
mkdir -p uploads/attachments uploads/chat uploads/versions instance
python3 - <<'PY'
import sys
sys.path.insert(0, '.')
from app import app, db, User

with app.app_context():
    db.create_all()
    admin = User.query.filter_by(username='admin').first()
    if not admin:
        admin = User(username='admin', email='admin@teamwork.local')
        admin.set_password('admin123')
        db.session.add(admin)
        db.session.commit()
        print('created admin/admin123')
PY
```

## 5. `.env` 模板

建议在项目根目录创建 `.env`：

```dotenv
SECRET_KEY=change-this-secret-key
JWT_SECRET_KEY=change-this-jwt-secret
FLASK_ENV=production
FLASK_DEBUG=0
DATABASE_URL=sqlite:////opt/teamwork/teamwork.db

OPENAI_API_BASE=http://127.0.0.1:11434/v1
OPENAI_API_KEY=local-key
OPENAI_MODEL=qwen2.5:14b-instruct

ONLYOFFICE_URL=http://192.168.1.10:8080
ONLYOFFICE_JWT_SECRET=change-this-onlyoffice-secret
INTERNAL_URL=http://172.17.0.1:5000

GUNICORN_WORKERS=4
GUNICORN_BIND=0.0.0.0:5000
```

说明：

- `ONLYOFFICE_URL` 是前端给浏览器使用的地址，必须是终端用户能访问到的地址。
- `INTERNAL_URL` 是给 OnlyOffice 容器使用的地址，必须是容器内能访问 TeamWork 的地址。
- 如果 TeamWork 和 OnlyOffice 都跑在 `docker compose` 同一网络内，`INTERNAL_URL` 应写为 `http://teamwork:5000`。
- 如果 TeamWork 跑宿主机、OnlyOffice 跑 Docker，Linux 默认可先使用 `http://172.17.0.1:5000`。
- 本地 AI 服务地址由 TeamWork 后端访问，不是浏览器访问，所以应填写“应用进程可达”的地址。

## 6. 本地 AI 服务配置

当前项目已经支持 `OpenAI` 兼容接口，适合对接：

- Ollama 的 OpenAI 兼容接口
- vLLM
- LocalAI
- One API / New API 等内网统一网关
- 其他兼容 `POST /chat/completions` 的模型服务

### 6.1 Ollama 示例

如果 Ollama 与 TeamWork 部署在同一台宿主机：

```dotenv
OPENAI_API_BASE=http://127.0.0.1:11434/v1
OPENAI_API_KEY=ollama
OPENAI_MODEL=qwen2.5:14b-instruct
```

说明：

- `OPENAI_API_KEY` 在部分本地服务中不会校验，但本项目要求非空，建议填写任意固定值。
- `OPENAI_MODEL` 必须与本地服务实际提供的模型名一致。

### 6.2 AI 配置优先级

项目支持两种配置方式：

1. 在 `.env` 中预置，适合生产环境持久化部署。
2. 在前端 “AI 智能助手” 面板中填写并保存，适合临时调试。

注意：

- 前端保存配置只会更新当前应用进程内存，不会回写 `.env`。
- 服务重启后，如未写入 `.env` 或 systemd 环境文件，AI 配置会丢失。

## 7. OnlyOffice 部署

### 7.1 导入离线镜像

```bash
docker load -i onlyoffice-documentserver.tar
```

### 7.2 单独启动 OnlyOffice

```bash
docker run -d \
  --name onlyoffice-ds \
  --restart unless-stopped \
  -p 8080:80 \
  -e JWT_ENABLED=true \
  -e JWT_SECRET=change-this-onlyoffice-secret \
  -e JWT_HEADER=Authorization \
  -v onlyoffice_data:/var/www/onlyoffice/Data \
  -v onlyoffice_log:/var/log/onlyoffice \
  onlyoffice/documentserver:latest
```

等待 1 到 2 分钟后检查：

```bash
curl http://127.0.0.1:8080/healthcheck
```

返回 `true` 表示服务已就绪。

### 7.3 配置要点

OnlyOffice 能否正常编辑，主要取决于以下三项：

1. `ONLYOFFICE_URL` 可被用户浏览器访问。
2. `INTERNAL_URL` 可被 OnlyOffice 容器访问。
3. `ONLYOFFICE_JWT_SECRET` 与容器中的 `JWT_SECRET` 完全一致。

任何一项不成立，都会出现以下问题：

- 文档页白屏或加载失败
- 打开编辑器后提示 token 无效
- 能打开但无法保存回 TeamWork

## 8. 运行 TeamWork

### 8.1 直接运行

```bash
cd /opt/teamwork
source .venv/bin/activate
export $(grep -v '^#' .env | xargs)
python app.py
```

### 8.2 Gunicorn 运行

```bash
cd /opt/teamwork
source .venv/bin/activate
export $(grep -v '^#' .env | xargs)
gunicorn -c gunicorn_config.py app:app
```

## 9. Docker Compose 一体化方案

如果 TeamWork 也运行在容器中，可直接使用项目自带 `docker-compose.yml`。该模式下关键关系是：

- `ONLYOFFICE_URL=http://onlyoffice:80` 是 TeamWork 容器内部访问地址
- `INTERNAL_URL=http://teamwork:5000` 是 OnlyOffice 容器回调地址
- 如果前端用户需要直接访问 OnlyOffice，通常还需要通过宿主机端口 `8080` 或反向代理暴露

说明：当前仓库内置的 `docker-compose.yml` 更偏向容器内部联通。如果你前面挂了 Nginx/内网域名，建议把浏览器访问地址和容器内部回调地址拆开核对，不要只看单一地址。

## 10. 验证清单

完成部署后按顺序验证：

1. 打开 `http://<host>:5000/health`，返回健康状态。
2. 使用 `admin / admin123` 登录后立即修改默认密码。
3. 上传一个 `docx` / `xlsx` / `pptx` 文件，确认可以打开 OnlyOffice。
4. 在 OnlyOffice 中编辑并保存，确认 TeamWork 中内容已回写。
5. 在 AI 面板中输入测试问题，确认本地模型服务返回结果。

## 11. 常见问题

### 11.1 AI 配了 `OPENAI_API_BASE` 但不生效

请确认：

- 当前版本代码已经包含 `OPENAI_API_BASE` 支持。
- `OPENAI_MODEL` 与本地服务模型名一致。
- TeamWork 进程到 `OPENAI_API_BASE` 的网络联通正常。

### 11.2 OnlyOffice 可以打开但保存失败

优先检查：

- `INTERNAL_URL` 是否从 OnlyOffice 容器内可访问。
- 回调地址 `/api/onlyoffice/callback` 或 `/api/onlyoffice/chat/callback` 是否被代理层拦截。
- JWT 密钥是否一致。

### 11.3 宿主机部署 TeamWork，容器部署 OnlyOffice

Linux 下优先尝试：

```dotenv
ONLYOFFICE_URL=http://<宿主机IP>:8080
INTERNAL_URL=http://172.17.0.1:5000
```

如果 Docker 网桥地址不是 `172.17.0.1`，请以实际桥接网关为准。
