# M5 深化学习：技术栈选择指南

选择一个技术栈深化学习文档生成工作流

---

## 📊 三大技术栈对比

### 1️⃣ FastAPI (Python)

**特点**：
- ✅ 自动生成 OpenAPI 3.0 规范（无需额外配置）
- ✅ 自动生成 Swagger UI + ReDoc
- ✅ 基于 Pydantic 模型的类型推断
- ✅ 学习难度最低
- ✅ 文档最自动化

**工作流**：
```
Python 函数定义 (FastAPI 装饰器 + 类型注解)
  ↓
FastAPI 自动提取信息
  ↓
生成 OpenAPI Schema
  ↓
Swagger UI / ReDoc 自动渲染
```

**学习内容**：
- FastAPI 路由定义
- Pydantic 模型和验证
- 自动 OpenAPI 生成机制
- 自定义 OpenAPI Schema
- Docstring 在自动文档中的作用

**时间投入**：30-45 分钟 ⏱️

**适合场景**：想快速看到自动文档效果的学习者

---

### 2️⃣ gRPC + Protobuf (多语言)

**特点**：
- ✅ 强类型定义（.proto 文件）
- ✅ 支持多语言（Python、Go、Java、JavaScript）
- ✅ 自动生成客户端和服务器代码
- ✅ 文档与代码紧密耦合
- ⚠️ 学习难度中等
- ⚠️ 文档生成需要额外工具

**工作流**：
```
.proto 文件定义 (Protocol Buffers)
  ↓
protoc 编译器生成代码
  ↓
protodoc 生成文档（可选）
  ↓
HTML/Markdown 文档展示
```

**学习内容**：
- Protocol Buffers 语法 (.proto)
- gRPC 服务定义
- Protobuf 消息和 RPC 方法
- 自动代码生成
- 文档工具（protodoc、buf-docs）

**时间投入**：60-90 分钟 ⏱️

**适合场景**：学习微服务架构、多语言协作的开发者

---

### 3️⃣ GraphQL + Schema (API 查询语言)

**特点**：
- ✅ 自描述的 Schema（Self-documenting）
- ✅ 强类型系统
- ✅ 支持内省（Introspection）查询
- ✅ 自动生成交互式文档
- ⚠️ 学习难度最高
- ⚠️ 需要理解查询语言概念

**工作流**：
```
GraphQL Schema 定义 (类型、查询、变更)
  ↓
GraphQL 服务部署
  ↓
内省（Introspection）查询自动生取 Schema
  ↓
Apollo GraphQL Studio / GraphiQL 可视化
```

**学习内容**：
- GraphQL 类型系统
- Query、Mutation、Subscription
- Resolver 函数
- Schema Directives 文档注解
- GraphQL 内省机制
- 交互式文档工具（Apollo Studio、GraphiQL）

**时间投入**：90-120 分钟 ⏱️

**适合场景**：想学习现代 API 设计模式的开发者

---

## 🎯 选择建议

### 如果你想...

| 需求 | 推荐 | 原因 |
|------|------|------|
| 快速看到文档效果 | **FastAPI** | 开箱即用，无需配置 |
| 学习微服务架构 | **gRPC** | 工业级标准，广泛应用 |
| 理解现代 API 设计 | **GraphQL** | 颠覆性技术，未来趋势 |
| 全面掌握三者 | 按顺序学习 | FastAPI → gRPC → GraphQL |

---

## 📋 各技术栈的准备工作

### FastAPI

**需要的工具**：
- Python 3.7+
- FastAPI 库 (`pip install fastapi uvicorn`)
- Pydantic 库（FastAPI 已依赖）

**预期输出**：
- 1 个 FastAPI 应用
- 3-4 个 API 端点
- 自动生成的 Swagger UI
- 对比 Swagger UI vs M5 的 swagger-jsdoc

**代码示例行数**：50-100 行

---

### gRPC + Protobuf

**需要的工具**：
- Protocol Buffers 编译器 (`brew install protobuf`)
- Python gRPC 库 (`pip install grpcio grpcio-tools`)
- protodoc（可选文档生成工具）

**预期输出**：
- 1 个 .proto 文件定义
- 自动生成的 Python gRPC 服务
- 客户端和服务器实现
- 生成的 .pb2.py 代码说明
- 文档 HTML/Markdown

**代码示例行数**：150-200 行

---

### GraphQL

**需要的工具**：
- Python GraphQL 库 (`pip install graphene` 或 `pip install strawberry-graphql`)
- Apollo Server（Node.js）或 Ariadne（Python）
- GraphiQL 或 Apollo Studio 浏览器工具

**预期输出**：
- 1 个 GraphQL Schema 定义
- 3-4 个 Query 和 Mutation
- Resolver 实现
- GraphiQL 交互式文档
- 内省查询示例

**代码示例行数**：100-150 行

---

## 🚀 学习路径

### 推荐顺序（全面掌握）

```
FastAPI (30-45 min) 
  ↓ [了解 REST + 自动文档]
gRPC (60-90 min)
  ↓ [理解 RPC + 强类型定义]
GraphQL (90-120 min)
  ↓ [掌握查询语言 + 自描述 Schema]
```

**总时间**：4-5 小时

---

## 📝 学习预期

对于每个技术栈，你将学到：

1. **核心概念** - 该技术如何定义和传输 API
2. **文档自动生成** - 如何从代码自动生成文档
3. **Docstring 集成** - 如何在文档中添加详细说明
4. **工具生态** - 相关的文档工具和查看工具
5. **对比分析** - 与 M5 中的 Swagger 的差异和优缺点

---

**请选择你想要深化学习的技术栈**（A / B / C）：

- **A: FastAPI** - 快速上手，自动生成 OpenAPI
- **B: gRPC + Protobuf** - 微服务标准，强类型定义
- **C: GraphQL** - 现代 API 设计，自描述 Schema
- **D: 全部都学** - 按推荐顺序完整学习（需要 4-5 小时）
