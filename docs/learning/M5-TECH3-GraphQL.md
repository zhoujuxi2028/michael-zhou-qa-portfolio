# M5 深化学习：Part 3 - GraphQL 自描述 Schema 与文档

**技术栈**: GraphQL + Strawberry (Python) / Apollo Server (Node.js)  
**学习时间**: 90-120 分钟  
**难度**: ⭐⭐⭐⭐ (较难)  
**工具**: Python 3.8+, Strawberry-GraphQL 或 Node.js + Apollo Server

---

## 🎯 学习目标

1. 理解 GraphQL 的核心概念（Schema、Query、Mutation、Subscription）
2. 学会使用 Strawberry 定义 GraphQL Schema
3. 实现 Query、Mutation 和 Subscription
4. 利用 GraphQL 的内省（Introspection）生成交互式文档
5. 对比 GraphQL 与 REST API 和 gRPC 的文档方式

---

## 📚 核心概念

### GraphQL 简介

GraphQL 是 Facebook 开发的 API 查询语言和运行时。

**关键特点**：
- ✅ 强类型 Schema（自描述）
- ✅ 灵活的查询能力（客户端指定需要的字段）
- ✅ 单一端点（vs REST 的多个端点）
- ✅ 实时订阅支持（Subscription）
- ✅ 完整的文档和验证
- ✅ 内省机制（可查询 Schema 本身）

**核心概念**：

```
Schema（模式定义）
  ├── Type（类型）
  │   ├── Scalar（标量）: String, Int, Float, Boolean, ID
  │   ├── Object（对象）: Product, User 等自定义类型
  │   ├── Enum（枚举）: ProductCategory, Status 等
  │   └── Interface（接口）: 类似 OOP 中的接口
  ├── Query（查询）- 读操作
  ├── Mutation（变更）- 写操作
  └── Subscription（订阅）- 实时推送

Query（查询） - 客户端请求
  ├── Fields（字段）
  ├── Arguments（参数）
  └── 返回强类型结果

Mutation（变更） - 数据修改
  ├── Input Types（输入类型）
  └── 返回修改后的数据

Subscription（订阅） - 实时更新
  └── WebSocket 推送
```

---

## 📝 示例代码：使用 Strawberry GraphQL (Python)

### 第 1 步：定义 GraphQL Schema

```python
"""
GraphQL Schema 定义
使用 Strawberry 框架（Python 的 GraphQL 库）
"""

from typing import Optional, List
import strawberry
from enum import Enum as PyEnum
from datetime import datetime

# ============================================================================
# 1. 定义枚举类型
# ============================================================================

@strawberry.enum
class ProductCategory(PyEnum):
    """产品分类"""
    ELECTRONICS = "electronics"
    BOOKS = "books"
    CLOTHING = "clothing"
    FOOD = "food"


@strawberry.enum
class SortOrder(PyEnum):
    """排序顺序"""
    ASC = "asc"
    DESC = "desc"


# ============================================================================
# 2. 定义对象类型
# ============================================================================

@strawberry.type
class Product:
    """
    产品对象。

    代表数据库中的一个产品记录。包含所有产品信息。
    """
    id: int  # 产品 ID
    name: str  # 产品名称
    description: Optional[str] = None  # 产品描述
    price: float  # 价格（美元）
    stock: int  # 库存数量
    category: ProductCategory  # 分类
    on_sale: bool = False  # 是否在促销
    created_at: Optional[datetime] = None  # 创建时间
    updated_at: Optional[datetime] = None  # 更新时间


@strawberry.type
class PaginatedProducts:
    """
    分页产品响应。

    包含产品列表和分页信息。
    """
    data: List[Product]  # 产品列表
    page: int  # 当前页码
    limit: int  # 每页数量
    total: int  # 总数
    has_next: bool  # 是否有下一页


@strawberry.input
class CreateProductInput:
    """
    创建产品的输入。

    用于 createProduct mutation 的参数。
    """
    name: str  # 名称（必需）
    description: Optional[str] = None  # 描述
    price: float  # 价格（必需，> 0）
    stock: int = 0  # 初始库存
    category: ProductCategory  # 分类（必需）


@strawberry.input
class UpdateProductInput:
    """更新产品的输入"""
    id: int  # 产品 ID（必需）
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    category: Optional[ProductCategory] = None
    on_sale: Optional[bool] = None


@strawberry.input
class ProductFilterInput:
    """
    产品搜索和筛选条件。

    用于查询时的筛选。
    """
    query: Optional[str] = None  # 搜索关键词（模糊匹配）
    category: Optional[ProductCategory] = None  # 筛选分类
    min_price: Optional[float] = None  # 最低价格
    max_price: Optional[float] = None  # 最高价格
    on_sale_only: bool = False  # 仅显示促销产品


@strawberry.input
class SortInput:
    """排序参数"""
    field: str  # 排序字段（"price", "name", "stock"）
    order: SortOrder = SortOrder.ASC  # 升序或降序


@strawberry.type
class SearchResult:
    """搜索结果"""
    products: List[Product]
    total: int
    query: str


# ============================================================================
# 3. 定义 Query（读操作）
# ============================================================================

@strawberry.type
class Query:
    """
    GraphQL 查询根类型。

    定义所有的读操作（Query）。
    """

    @strawberry.field
    def product(self, id: int) -> Optional[Product]:
        """
        获取单个产品。

        通过 ID 获取产品详情。

        Args:
            id: 产品 ID

        Returns:
            Product 对象，如果不存在则返回 None

        Example:
            query {
              product(id: 1) {
                id
                name
                price
              }
            }
        """
        # 模拟数据库查询
        products = get_all_products()
        for p in products:
            if p.id == id:
                return p
        return None

    @strawberry.field
    def products(
        self,
        page: int = 1,
        limit: int = 10,
        filter: Optional[ProductFilterInput] = None,
        sort: Optional[SortInput] = None,
    ) -> PaginatedProducts:
        """
        获取产品列表（分页、筛选、排序）。

        支持分页、多条件筛选和排序。

        Args:
            page: 页码（从 1 开始）
            limit: 每页数量（1-100）
            filter: 筛选条件（可选）
            sort: 排序参数（可选）

        Returns:
            PaginatedProducts 对象包含产品列表和分页信息

        Example:
            query {
              products(page: 1, limit: 5, filter: {category: ELECTRONICS}) {
                data {
                  id
                  name
                  price
                }
                page
                total
                hasNext
              }
            }
        """
        # 实现分页、筛选、排序逻辑
        products = get_all_products()

        # 筛选
        if filter:
            if filter.query:
                products = [
                    p for p in products
                    if filter.query.lower() in p.name.lower()
                ]
            if filter.category:
                products = [p for p in products if p.category == filter.category]
            if filter.min_price:
                products = [p for p in products if p.price >= filter.min_price]
            if filter.max_price:
                products = [p for p in products if p.price <= filter.max_price]
            if filter.on_sale_only:
                products = [p for p in products if p.on_sale]

        # 排序
        if sort:
            reverse = sort.order == SortOrder.DESC
            if sort.field == "price":
                products.sort(key=lambda p: p.price, reverse=reverse)
            elif sort.field == "name":
                products.sort(key=lambda p: p.name, reverse=reverse)
            elif sort.field == "stock":
                products.sort(key=lambda p: p.stock, reverse=reverse)

        # 分页
        offset = (page - 1) * limit
        data = products[offset : offset + limit]
        total = len(products)
        has_next = offset + limit < total

        return PaginatedProducts(
            data=data,
            page=page,
            limit=limit,
            total=total,
            has_next=has_next,
        )

    @strawberry.field
    def search_products(
        self, query: str, category: Optional[ProductCategory] = None
    ) -> SearchResult:
        """
        搜索产品。

        支持按关键词和分类搜索。

        Args:
            query: 搜索关键词
            category: 可选的分类筛选

        Returns:
            SearchResult 包含搜索结果和匹配数

        Example:
            query {
              searchProducts(query: "laptop", category: ELECTRONICS) {
                products { name price }
                total
              }
            }
        """
        products = get_all_products()

        # 关键词搜索
        results = [
            p for p in products
            if query.lower() in p.name.lower()
            or (p.description and query.lower() in p.description.lower())
        ]

        # 分类筛选
        if category:
            results = [p for p in results if p.category == category]

        return SearchResult(
            products=results, total=len(results), query=query
        )


# ============================================================================
# 4. 定义 Mutation（写操作）
# ============================================================================

@strawberry.type
class Mutation:
    """
    GraphQL 变更根类型。

    定义所有的写操作（Mutation）。
    """

    @strawberry.mutation
    def create_product(self, input: CreateProductInput) -> Product:
        """
        创建新产品。

        在数据库中创建新产品并返回完整对象。

        Args:
            input: 产品创建参数

        Returns:
            创建的 Product 对象（包含自动生成的 ID）

        Raises:
            ValueError: 如果参数无效（如 price <= 0）

        Example:
            mutation {
              createProduct(input: {
                name: "Gaming Mouse"
                price: 49.99
                stock: 100
                category: ELECTRONICS
              }) {
                id
                name
                createdAt
              }
            }
        """
        # 验证
        if input.price <= 0:
            raise ValueError("价格必须大于 0")

        # 创建新产品
        new_id = len(get_all_products()) + 1
        new_product = Product(
            id=new_id,
            name=input.name,
            description=input.description,
            price=input.price,
            stock=input.stock,
            category=input.category,
            on_sale=False,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

        # 保存到数据库（这里只是追加到列表）
        get_all_products().append(new_product)

        return new_product

    @strawberry.mutation
    def update_product(self, input: UpdateProductInput) -> Optional[Product]:
        """
        更新产品信息。

        更新指定 ID 的产品。

        Args:
            input: 产品更新参数（包含 ID）

        Returns:
            更新后的 Product 对象，如果不存在则返回 None

        Example:
            mutation {
              updateProduct(input: {
                id: 1
                price: 899.99
                on_sale: true
              }) {
                id
                price
                updatedAt
              }
            }
        """
        products = get_all_products()
        for i, p in enumerate(products):
            if p.id == input.id:
                # 更新字段
                if input.name is not None:
                    p.name = input.name
                if input.description is not None:
                    p.description = input.description
                if input.price is not None:
                    p.price = input.price
                if input.stock is not None:
                    p.stock = input.stock
                if input.category is not None:
                    p.category = input.category
                if input.on_sale is not None:
                    p.on_sale = input.on_sale

                p.updated_at = datetime.now()
                products[i] = p
                return p

        return None

    @strawberry.mutation
    def delete_product(self, id: int) -> bool:
        """
        删除产品。

        从数据库中删除指定 ID 的产品。

        Args:
            id: 产品 ID

        Returns:
            True 如果删除成功，False 如果产品不存在

        Example:
            mutation {
              deleteProduct(id: 1)
            }
        """
        products = get_all_products()
        for p in products:
            if p.id == id:
                products.remove(p)
                return True
        return False


# ============================================================================
# 5. 定义 Subscription（实时推送）
# ============================================================================

@strawberry.type
class Subscription:
    """
    GraphQL 订阅根类型。

    定义实时推送操作（需要 WebSocket）。
    """

    @strawberry.subscription
    async def product_updated(self) -> Product:
        """
        订阅产品更新。

        当任何产品被更新时，实时推送新的产品数据。

        Example:
            subscription {
              productUpdated {
                id
                name
                price
                updatedAt
              }
            }
        """
        # 这是一个占位符实现
        # 实际应该使用 WebSocket 和事件发送器
        import asyncio

        products = get_all_products()
        while True:
            for product in products:
                yield product
            await asyncio.sleep(5)  # 每 5 秒推送一次


# ============================================================================
# 6. 创建 GraphQL Schema
# ============================================================================

schema = strawberry.Schema(query=Query, mutation=Mutation, subscription=Subscription)


# ============================================================================
# 7. 辅助函数：模拟数据库
# ============================================================================

_products_db: List[Product] = []


def get_all_products() -> List[Product]:
    """获取所有产品"""
    global _products_db
    if not _products_db:
        _products_db = [
            Product(
                id=1,
                name="Laptop",
                description="High-performance laptop",
                price=999.99,
                stock=100,
                category=ProductCategory.ELECTRONICS,
                on_sale=False,
                created_at=datetime.now(),
            ),
            Product(
                id=2,
                name="Python Book",
                description="Learn Python programming",
                price=49.99,
                stock=500,
                category=ProductCategory.BOOKS,
                on_sale=True,
                created_at=datetime.now(),
            ),
        ]
    return _products_db
```

### 第 2 步：创建 GraphQL 服务器

```python
"""
GraphQL 服务器（基于 Strawberry）
"""

from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter

from schema import schema

# 创建 FastAPI 应用
app = FastAPI(title="GraphQL 产品 API")

# 创建 GraphQL 路由
graphql_router = GraphQLRouter(schema)

# 添加路由
app.include_router(graphql_router, prefix="/graphql")


if __name__ == "__main__":
    import uvicorn

    # 运行服务器
    # uvicorn server:app --reload

    # 访问以下 URL：
    # - GraphQL Playground: http://localhost:8000/graphql
    # - API 文档: http://localhost:8000/docs

    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## 🔍 GraphQL 的自描述特性

### 内省（Introspection）查询

GraphQL 的强大之处在于它能查询自己的 Schema：

```graphql
# 查询所有类型
{
  __schema {
    types {
      name
      description
      fields {
        name
        type {
          name
          kind
        }
      }
    }
  }
}

# 查询特定类型
{
  __type(name: "Product") {
    name
    description
    fields {
      name
      type { name }
      description
    }
  }
}
```

### 自动生成文档

GraphQL 的内省机制使得：
- ✅ GraphQL IDE（GraphiQL、Apollo Studio）能自动生成交互式文档
- ✅ 不需要额外的文档工具
- ✅ Schema 变化时文档自动更新

---

## 📊 GraphQL vs REST vs gRPC 对比

| 特性 | REST | GraphQL | gRPC |
|------|------|---------|------|
| **查询灵活性** | 固定字段 | ⭐⭐⭐⭐⭐ 客户端灵活指定 | 固定结构 |
| **端点数量** | 多个 | 单一端点 | 多个 RPC |
| **数据过度获取** | 容易发生 | 避免 | 避免 |
| **学习曲线** | 平缓 | 陡峭 | 中等 |
| **文档自动化** | 需要 Swagger | ⭐⭐⭐⭐⭐ 完全自动 | 从 .proto |
| **实时支持** | 需要 WebSocket | 原生 Subscription | 单向流 |
| **性能** | 中等 | 中等 | 高 |
| **浏览器支持** | 好 | 好 | 差 |
| **类型安全** | 弱 | 强 | 强 |

---

## 🚀 GraphQL 最佳实践

1. **写清晰的 Docstring**
   ```python
   @strawberry.field
   def products(self, page: int = 1) -> List[Product]:
       """
       获取产品列表。

       支持分页，返回指定页码的产品。

       Args:
           page: 页码（从 1 开始）

       Returns:
           Product 列表

       Example:
           query {
             products(page: 1) { name price }
           }
       """
   ```

2. **使用输入类型而不是多个参数**
   ```python
   # ✅ 好
   @strawberry.mutation
   def create_product(self, input: CreateProductInput) -> Product:
       pass

   # ❌ 差
   @strawberry.mutation
   def create_product(
       self, name: str, price: float, stock: int, category: str
   ) -> Product:
       pass
   ```

3. **明确区分 Query、Mutation、Subscription**
   ```python
   # ✅ Query - 读操作，无副作用
   @strawberry.type
   class Query:
       def products(self) -> List[Product]:
           pass

   # ✅ Mutation - 写操作，有副作用
   @strawberry.type
   class Mutation:
       def create_product(self, input: CreateProductInput) -> Product:
           pass

   # ✅ Subscription - 实时推送
   @strawberry.type
   class Subscription:
       async def product_updated(self) -> Product:
           pass
   ```

---

## 🔧 运行 GraphQL 服务器

### 安装依赖

```bash
pip install strawberry-graphql fastapi uvicorn
```

### 运行服务器

```bash
uvicorn server:app --reload
```

### 访问 GraphQL Playground

```
http://localhost:8000/graphql
```

---

## 📋 常用 GraphQL 查询示例

```graphql
# 查询 1: 获取产品列表
query {
  products(page: 1, limit: 5) {
    data {
      id
      name
      price
      onSale
    }
    total
  }
}

# 查询 2: 搜索产品
query {
  searchProducts(query: "laptop", category: ELECTRONICS) {
    products {
      name
      price
    }
    total
  }
}

# 变更 1: 创建产品
mutation {
  createProduct(input: {
    name: "Gaming Mouse"
    price: 49.99
    category: ELECTRONICS
    stock: 100
  }) {
    id
    name
    createdAt
  }
}

# 变更 2: 更新产品
mutation {
  updateProduct(input: {
    id: 1
    price: 899.99
    onSale: true
  }) {
    id
    price
    updatedAt
  }
}

# 订阅: 实时产品更新
subscription {
  productUpdated {
    id
    name
    updatedAt
  }
}

# 内省: 查询 Schema
{
  __schema {
    types {
      name
    }
  }
}
```

---

## ✅ 学习检查清单

完成本部分后，你应该能够：

- [ ] 理解 GraphQL 的核心概念（Schema、Query、Mutation、Subscription）
- [ ] 编写自描述的 GraphQL Schema
- [ ] 实现 Query、Mutation 和 Subscription
- [ ] 使用 GraphQL Playground/Apollo Studio 测试 API
- [ ] 利用内省机制生成交互式文档
- [ ] 对比 GraphQL、REST、gRPC 的文档方式和应用场景

---

**总耗时**: 90-120 分钟  
**完成**: M5 全部深化学习内容  
**总耗时**: ~4-5 小时  
**预计完成时间**: 2026-04-15 傍晚
