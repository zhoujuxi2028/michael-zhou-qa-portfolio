# M5 深化学习：Part 1 - FastAPI 自动文档生成

**技术栈**: FastAPI + Pydantic + Swagger UI + ReDoc  
**学习时间**: 45 分钟  
**难度**: ⭐⭐ (简单)  
**工具**: Python 3.7+, FastAPI, Uvicorn

---

## 🎯 学习目标

1. 理解 FastAPI 如何自动生成 OpenAPI 规范
2. 学会编写自文档化的 API（通过类型注解 + Docstring）
3. 对比 FastAPI 自动文档 vs M5 中的 swagger-jsdoc 方式
4. 实践 Pydantic 模型在文档中的作用

---

## 📚 核心概念

### FastAPI 的自动文档原理

FastAPI 使用**类型注解**和**装饰器**来自动生成 OpenAPI 3.0 规范：

```python
# FastAPI 如何工作
函数签名（类型注解）+ 装饰器参数
  ↓
FastAPI 反射提取信息
  ↓
自动生成 OpenAPI Schema
  ↓
Swagger UI / ReDoc 渲染
```

**关键区别**：
- M5 中的 swagger-jsdoc：**JSDoc 注释** → swagger-jsdoc 扫描 → OpenAPI
- FastAPI：**类型注解** → FastAPI 反射 → OpenAPI（无需额外扫描）

---

## 📝 示例代码

创建完整的 FastAPI 应用示例：

### 文件：`M5-fastapi-example.py`

```python
"""
FastAPI 自文档化 API 示例
演示如何通过类型注解和 Docstring 自动生成 OpenAPI 文档
"""

from typing import Optional, List
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
from enum import Enum

# ============================================================================
# 1. 创建 FastAPI 应用
# ============================================================================

app = FastAPI(
    title="产品管理系统 API",
    description="使用 FastAPI 和 Pydantic 的自文档化 API 示例",
    version="1.0.0",
    contact={
        "name": "QA Team",
        "email": "qa@example.com",
    },
    license_info={
        "name": "MIT",
    },
)

# ============================================================================
# 2. 定义 Pydantic 模型（自动生成 Schema）
# ============================================================================

class ProductCategory(str, Enum):
    """产品分类枚举"""
    ELECTRONICS = "electronics"
    BOOKS = "books"
    CLOTHING = "clothing"
    FOOD = "food"


class Product(BaseModel):
    """
    产品数据模型。

    此模型定义了产品的所有属性，Pydantic 会自动验证和生成 JSON Schema。
    """
    id: int = Field(..., description="产品唯一标识", example=1)
    name: str = Field(..., description="产品名称", example="Laptop", min_length=1, max_length=100)
    description: Optional[str] = Field(None, description="产品描述", example="High-performance laptop")
    price: float = Field(..., description="产品价格（美元）", gt=0, example=999.99)
    stock: int = Field(default=0, description="库存数量", ge=0, example=100)
    category: ProductCategory = Field(..., description="产品分类", example="electronics")
    on_sale: bool = Field(default=False, description="是否在促销中")

    class Config:
        """Pydantic 配置"""
        json_schema_extra = {
            "example": {
                "id": 1,
                "name": "Gaming Laptop",
                "description": "RTX 3080, 32GB RAM",
                "price": 1499.99,
                "stock": 50,
                "category": "electronics",
                "on_sale": True
            }
        }


class CreateProductRequest(BaseModel):
    """创建产品的请求模型（不需要 ID）"""
    name: str = Field(..., description="产品名称", min_length=1, max_length=100)
    description: Optional[str] = Field(None, description="产品描述")
    price: float = Field(..., description="产品价格", gt=0)
    stock: int = Field(default=0, description="库存数量", ge=0)
    category: ProductCategory = Field(..., description="产品分类")


class PaginatedResponse(BaseModel):
    """分页响应模型"""
    data: List[Product] = Field(..., description="数据列表")
    page: int = Field(..., description="当前页码", ge=1)
    limit: int = Field(..., description="每页条数", ge=1)
    total: int = Field(..., description="总数据条数", ge=0)

    class Config:
        json_schema_extra = {
            "example": {
                "data": [
                    {
                        "id": 1,
                        "name": "Laptop",
                        "price": 999.99,
                        "stock": 100,
                        "category": "electronics",
                        "on_sale": False
                    }
                ],
                "page": 1,
                "limit": 10,
                "total": 50
            }
        }


# ============================================================================
# 3. 定义 API 端点（FastAPI 自动从函数签名生成文档）
# ============================================================================

# 模拟数据库
products_db = [
    {"id": 1, "name": "Laptop", "description": "High-end laptop", "price": 999.99, 
     "stock": 100, "category": "electronics", "on_sale": False},
    {"id": 2, "name": "Mouse", "description": "Wireless mouse", "price": 29.99, 
     "stock": 500, "category": "electronics", "on_sale": True},
]


@app.get("/api/products", response_model=PaginatedResponse, tags=["Products"])
async def list_products(
    page: int = Query(1, description="页码（从 1 开始）", ge=1),
    limit: int = Query(10, description="每页数量", ge=1, le=100),
) -> PaginatedResponse:
    """
    获取产品列表（分页）。

    分页获取数据库中的所有产品。支持通过 page 和 limit 参数控制分页。

    **参数说明**：
    - page: 页码，从 1 开始
    - limit: 每页返回的数据条数，最多 100 条

    **返回值**：
    包含产品列表、当前页码、限制数和总数的分页对象。

    **示例**：
    ```
    GET /api/products?page=1&limit=5
    ```
    """
    offset = (page - 1) * limit
    total = len(products_db)
    data = products_db[offset:offset + limit]
    
    return PaginatedResponse(
        data=[Product(**p) for p in data],
        page=page,
        limit=limit,
        total=total
    )


@app.get("/api/products/{product_id}", response_model=Product, tags=["Products"])
async def get_product(
    product_id: int = Query(..., description="产品 ID", gt=0)
) -> Product:
    """
    获取单个产品详情。

    通过产品 ID 获取单个产品的完整信息。

    **路径参数**：
    - product_id: 产品的唯一标识符

    **返回值**：
    完整的产品对象，包含所有字段信息。

    **异常**：
    - 404 Not Found: 当指定的产品 ID 不存在时

    **示例**：
    ```
    GET /api/products/1
    返回：
    {
        "id": 1,
        "name": "Laptop",
        "price": 999.99,
        ...
    }
    ```
    """
    for product in products_db:
        if product["id"] == product_id:
            return Product(**product)
    
    raise HTTPException(status_code=404, detail="Product not found")


@app.post("/api/products", response_model=Product, status_code=201, tags=["Products"])
async def create_product(
    request: CreateProductRequest
) -> Product:
    """
    创建新产品。

    在数据库中创建一个新的产品记录。返回创建的产品对象（包含自动生成的 ID）。

    **请求体**：
    包含产品的必需和可选字段。name 和 price 是必需的。

    **返回值**：
    新创建的完整产品对象（201 Created）。

    **异常**：
    - 400 Bad Request: 缺少必需字段或字段验证失败

    **自动验证**（由 Pydantic 执行）：
    - name: 长度 1-100 字符
    - price: 必须大于 0
    - stock: 必须大于等于 0
    - category: 必须是有效的枚举值

    **示例**：
    ```
    POST /api/products
    {
        "name": "Gaming Keyboard",
        "price": 149.99,
        "stock": 200,
        "category": "electronics"
    }
    
    返回（201）：
    {
        "id": 3,
        "name": "Gaming Keyboard",
        "price": 149.99,
        "stock": 200,
        "category": "electronics",
        "on_sale": false
    }
    ```
    """
    # 生成新 ID
    new_id = max((p["id"] for p in products_db), default=0) + 1
    
    # 创建新产品
    new_product = {
        "id": new_id,
        **request.dict()
    }
    products_db.append(new_product)
    
    return Product(**new_product)


@app.put("/api/products/{product_id}", response_model=Product, tags=["Products"])
async def update_product(
    product_id: int = Query(..., description="产品 ID", gt=0),
    request: CreateProductRequest = None
) -> Product:
    """
    更新产品信息。

    更新指定产品的信息。支持更新所有字段（除了 ID）。

    **异常**：
    - 404 Not Found: 产品 ID 不存在
    """
    for product in products_db:
        if product["id"] == product_id:
            updated = {**product, **request.dict(exclude_unset=True)}
            idx = products_db.index(product)
            products_db[idx] = updated
            return Product(**updated)
    
    raise HTTPException(status_code=404, detail="Product not found")


@app.delete("/api/products/{product_id}", status_code=204, tags=["Products"])
async def delete_product(
    product_id: int = Query(..., description="产品 ID", gt=0)
):
    """
    删除产品。

    从数据库中删除指定 ID 的产品。

    **异常**：
    - 404 Not Found: 产品 ID 不存在
    """
    for product in products_db:
        if product["id"] == product_id:
            products_db.remove(product)
            return
    
    raise HTTPException(status_code=404, detail="Product not found")


# ============================================================================
# 4. 额外的配置：自定义 OpenAPI Schema
# ============================================================================

@app.get("/api/health", tags=["Health"])
async def health_check():
    """
    健康检查端点。

    检查 API 服务是否正常运行。总是返回 200 OK。
    """
    return {"status": "healthy", "version": "1.0.0"}


# ============================================================================
# 运行说明
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    # 运行服务器
    # uvicorn M5_fastapi_example:app --reload
    
    # 访问以下 URL：
    # - Swagger UI: http://localhost:8000/docs
    # - ReDoc: http://localhost:8000/redoc
    # - OpenAPI JSON: http://localhost:8000/openapi.json
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## 🚀 FastAPI 的关键特性

### 1. 类型注解自动文档化

```python
@app.get("/products")
async def list_products(
    page: int = Query(1, description="页码"),
    limit: int = Query(10, description="每页数量")
):
    """获取产品列表"""
    pass

# ✅ FastAPI 自动提取：
# - 参数名：page, limit
# - 参数类型：int
# - 默认值：1, 10
# - 描述：来自 Query() 的 description
# - 文档：来自函数 Docstring
```

### 2. Pydantic 模型自动 Schema 生成

```python
class Product(BaseModel):
    id: int = Field(..., description="产品 ID", example=1)
    name: str = Field(..., description="名称", min_length=1)
    price: float = Field(..., description="价格", gt=0)

# ✅ FastAPI 自动生成 JSON Schema：
# {
#   "type": "object",
#   "properties": {
#     "id": {"type": "integer", "description": "产品 ID"},
#     "name": {"type": "string", "minLength": 1},
#     "price": {"type": "number", "exclusiveMinimum": 0}
#   },
#   "required": ["id", "name", "price"]
# }
```

### 3. 响应模型验证

```python
@app.get("/products", response_model=PaginatedResponse)
async def list_products():
    pass

# ✅ FastAPI 自动：
# - 验证响应符合 PaginatedResponse 结构
# - 在 Swagger UI 中显示响应 Schema
# - 自动序列化为 JSON
```

---

## 📊 FastAPI vs M5 中的 Swagger 对比

| 特性 | FastAPI | M5 (swagger-jsdoc) |
|------|---------|-------------------|
| **实现方式** | 类型注解 + 反射 | JSDoc 注释 + 扫描 |
| **自动化程度** | ⭐⭐⭐⭐⭐ 完全自动 | ⭐⭐⭐ 需要手写 |
| **编码时间** | 短（代码即文档） | 中（需要额外注释） |
| **类型安全** | ⭐⭐⭐⭐⭐ 强类型检查 | ⭐⭐ 运行时检查 |
| **自文档化** | ⭐⭐⭐⭐⭐ 自动 | ⭐⭐⭐ 手动 |
| **学习曲线** | 平缓 | 陡峭 |
| **生产就绪** | ✅ 是 | ✅ 是 |

---

## 💡 FastAPI 的最佳实践

1. **始终使用类型注解**
   ```python
   # ✅ 好
   def get_product(id: int) -> Product:
       pass
   
   # ❌ 差
   def get_product(id):
       pass
   ```

2. **为复杂类型编写详细 Docstring**
   ```python
   @app.post("/products")
   async def create_product(request: CreateProductRequest) -> Product:
       """
       创建产品。
       
       - 自动验证 name 长度
       - 自动验证 price > 0
       - 返回创建的完整产品
       """
       pass
   ```

3. **使用 Field() 添加详细说明**
   ```python
   class Product(BaseModel):
       price: float = Field(
           ..., 
           description="价格（美元）",
           gt=0,
           example=99.99
       )
   ```

---

## 🔧 运行 FastAPI 应用

### 第 1 步：安装依赖

```bash
pip install fastapi uvicorn pydantic
```

### 第 2 步：保存示例代码

```bash
# 保存上面的代码为 M5-fastapi-example.py
```

### 第 3 步：运行服务器

```bash
uvicorn M5-fastapi-example:app --reload
```

### 第 4 步：访问文档

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

---

## 📋 Copilot Prompt 示例

### Prompt 1: FastAPI 应用框架

```bash
gh copilot suggest "创建一个 FastAPI 应用框架，包含以下功能：

需求：
- 使用 Pydantic 定义用户和订单模型
- 创建用户 CRUD API endpoints
- 添加完整的 Docstring 说明
- 包含分页、过滤等高级功能

要求：
- 类型注解完整
- 错误处理清晰
- 自文档化
- 可直接运行"
```

### Prompt 2: Pydantic 模型优化

```bash
gh copilot suggest "为以下 FastAPI 应用优化 Pydantic 模型定义：

代码（粘贴你的 models.py）

要求：
- 添加字段验证（长度、范围等）
- 加入详细的 Field 说明
- 包含示例值（example）
- 添加配置说明（Config 类）"
```

---

## ✅ 学习检查清单

完成本部分后，你应该能够：

- [ ] 理解 FastAPI 如何通过类型注解自动生成文档
- [ ] 编写自文档化的 Pydantic 模型
- [ ] 创建完整的 FastAPI CRUD 应用
- [ ] 在 Swagger UI 中测试 API
- [ ] 对比 FastAPI 自动文档 vs swagger-jsdoc 手动方式
- [ ] 理解何时使用 FastAPI vs Express/Node.js

---

**总耗时**: 45 分钟  
**下一步**: Part 2 - gRPC + Protobuf（微服务标准）  
**预计完成时间**: 2026-04-15 下午
