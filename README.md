# TeamWork 协作平台

TeamWork 是一个现代化的团队协作和项目管理平台，集成了看板管理、实时聊天、文档协作和 AI 辅助功能。

## ✨ 主要功能

- **看板项目管理**：支持自定义列、拖拽排序、任务分类和状态追踪。
- **实时协作**：项目内实时聊天室，支持文件共享和未读消息提醒。
- **文档办公**：集成 OnlyOffice，支持 Word、Excel、PPT 等文档的在线预览和多人协同编辑。
- **AI 智能助手**：集成 OpenAI，支持项目内容问答和自动总结。
- **现代化 UI**：清爽的浅色/深色主题，响应式设计。

## 🛠️ 系统要求

- **操作系统**: Linux (推荐 Ubuntu 20.04+)
- **Python**: 3.8+
- **Docker**: (可选) 用于部署 OnlyOffice 文档服务器

## 🚀 快速开始

### 1. 本地开发环境

```bash
# 克隆代码
git clone <repository_url>
cd teamwork

# 创建并激活虚拟环境
python3 -m venv .venv
source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 初始化数据库
flask db upgrade

# 启动应用
python app.py
```

访问地址: `http://localhost:5000`
默认管理员账号: `admin` / `admin123`

### 2. 服务器部署 (使用 deploy.sh)

项目提供了一键部署脚本 `deploy.sh`，支持多种部署模式。

**赋予脚本执行权限:**
```bash
chmod +x deploy.sh
```

**选项 1: 生产环境部署 (Gunicorn + Systemd)**
```bash
./deploy.sh --production
```
此命令将安装依赖、配置 Gunicorn 并创建 Systemd 服务 `teamwork.service`。

**选项 2: 包含 OnlyOffice 的部署**
```bash
./deploy.sh --production --with-onlyoffice
```
此命令会自动安装 Docker 并部署 OnlyOffice Document Server，同时配置 Flask 应用与之连接。

**选项 3: 全 Docker 部署**
```bash
./deploy.sh --docker
```
使用 Docker Compose 同时启动 Flask 应用和 OnlyOffice 服务。

## ⚙️ 配置说明

项目配置位于 `config.py`，主要通过环境变量进行控制。你可以在项目根目录创建 `.env` 文件来设置这些变量。

| 环境变量 | 说明 | 默认值 |
|---|---|---|
| `FLASK_APP` | 入口文件 | `app.py` |
| `FLASK_ENV` | 环境模式 | `development` (生产环境请设为 `production`) |
| `SECRET_KEY` | Flask 密钥 | 随机字符串 |
| `DATABASE_URL` | 数据库连接字符串 | `sqlite:///teamwork.db` |
| `OPENAI_API_KEY` | OpenAI API 密钥 | (空) |
| `OPENAI_API_BASE` | OpenAI API 地址 | (可选，用于代理) |
| `ONLYOFFICE_URL` | OnlyOffice 服务地址 | `http://localhost:8080` |

## 📦 版本控制与文档

- **手动保存版本**: 在 OnlyOffice 编辑器中点击“保存版本”可创建文档快照。
- **版本恢复**: 可以在文件详情页查看历史版本并恢复（自动清理缓存）。

## 📝 许可证

MIT License
