# M5 深化学习：Part 2 - gRPC + Protobuf 文档生成

**技术栈**: gRPC + Protocol Buffers (Protobuf) + protoc 编译器  
**学习时间**: 60-90 分钟  
**难度**: ⭐⭐⭐ (中等)  
**工具**: Python 3.7+, Protocol Buffers 编译器, grpcio

---

## 🎯 学习目标

1. 理解 Protocol Buffers (Protobuf) 的语法和概念
2. 学会定义 gRPC 服务和消息
3. 自动生成 Python gRPC 代码
4. 从 .proto 文件生成文档
5. 对比 gRPC 与 REST API 的文档差异

---

## 📚 核心概念

### Protocol Buffers 简介

Protocol Buffers (protobuf) 是 Google 开发的数据序列化格式。

**关键特点**：
- ✅ 强类型定义（.proto 文件）
- ✅ 自动生成多语言代码（Python、Go、Java、C++、JavaScript）
- ✅ 二进制序列化（更紧凑、更快）
- ✅ 向后兼容性（字段可选、可添加新字段）
- ✅ 自描述的 Schema（proto 文件本身就是文档）

**vs REST API 和 JSON**：

| 特性 | REST/JSON | gRPC/Protobuf |
|------|-----------|---------------|
| **传输协议** | HTTP 1.1 | HTTP 2.0 |
| **数据格式** | JSON (文本) | Protobuf (二进制) |
| **大小** | 较大 | 更小（~3-10x） |
| **速度** | 较慢 | 更快（~5-7x） |
| **文档** | Swagger/OpenAPI | Proto 文件 + 代码生成 |
| **适用场景** | Web 浏览器、跨域 | 微服务、高性能 |

---

## 📝 示例代码

### 第 1 步：定义 Protobuf 文件 (products.proto)

```protobuf
syntax = "proto3";

package products;

// 产品分类枚举
enum ProductCategory {
  CATEGORY_UNSPECIFIED = 0;
  ELECTRONICS = 1;
  BOOKS = 2;
  CLOTHING = 3;
  FOOD = 4;
}

// 产品数据结构
message Product {
  int32 id = 1;              // 产品 ID
  string name = 2;           // 产品名称
  string description = 3;    // 产品描述（可选）
  float price = 4;           // 价格（美元）
  int32 stock = 5;           // 库存数量
  ProductCategory category = 6;  // 分类
  bool on_sale = 7;          // 是否促销中
}

// 创建产品请求
message CreateProductRequest {
  string name = 1;           // 产品名称（必需）
  string description = 2;    // 描述（可选）
  float price = 3;           // 价格（必需）
  int32 stock = 4;           // 初始库存
  ProductCategory category = 5;  // 分类（必需）
}

// 分页参数
message PaginationRequest {
  int32 page = 1;            // 页码
  int32 limit = 2;           // 每页数量
}

// 分页响应
message PaginatedProductResponse {
  repeated Product data = 1; // 产品列表
  int32 page = 2;            // 当前页码
  int32 limit = 3;           // 每页数量
  int32 total = 4;           // 总数
}

// 产品搜索请求
message SearchProductRequest {
  string query = 1;          // 搜索关键词
  ProductCategory category = 2;  // 筛选分类（可选）
  float min_price = 3;       // 最低价格
  float max_price = 4;       // 最高价格
}

// 空请求（用于无参数的 RPC）
message Empty {}

// gRPC 服务定义
service ProductService {
  // 获取产品列表（分页）
  rpc ListProducts(PaginationRequest) returns (PaginatedProductResponse) {}
  
  // 获取单个产品
  rpc GetProduct(GetProductRequest) returns (Product) {}
  
  // 创建产品
  rpc CreateProduct(CreateProductRequest) returns (Product) {}
  
  // 更新产品
  rpc UpdateProduct(Product) returns (Product) {}
  
  // 删除产品
  rpc DeleteProduct(GetProductRequest) returns (Empty) {}
  
  // 搜索产品
  rpc SearchProducts(SearchProductRequest) returns (PaginatedProductResponse) {}
  
  // 流式获取产品列表
  rpc StreamProducts(PaginationRequest) returns (stream Product) {}
}

// 获取产品请求
message GetProductRequest {
  int32 product_id = 1;
}
```

### 第 2 步：编译 Protobuf 文件

```bash
# 安装 protobuf 编译器
brew install protobuf

# 生成 Python 代码
python -m grpc_tools.protoc \
  -I. \
  --python_out=. \
  --grpc_python_out=. \
  products.proto

# 生成的文件：
# - products_pb2.py (消息类定义)
# - products_pb2_grpc.py (gRPC 服务接口)
```

### 第 3 步：实现 gRPC 服务 (server.py)

```python
"""
gRPC 产品服务实现
"""

import grpc
from concurrent import futures
import products_pb2
import products_pb2_grpc

# 模拟数据库
products_db = [
    {
        "id": 1,
        "name": "Laptop",
        "description": "High-performance laptop",
        "price": 999.99,
        "stock": 100,
        "category": products_pb2.ELECTRONICS,
        "on_sale": False,
    },
    {
        "id": 2,
        "name": "Python Book",
        "description": "Learn Python programming",
        "price": 49.99,
        "stock": 500,
        "category": products_pb2.BOOKS,
        "on_sale": True,
    },
]


class ProductServicer(products_pb2_grpc.ProductServiceServicer):
    """产品服务实现"""

    def ListProducts(self, request, context):
        """
        获取产品列表（分页）。

        实现分页逻辑，返回指定页码的产品列表。

        Args:
            request (PaginationRequest): 包含 page 和 limit 参数
            context: gRPC 上下文

        Returns:
            PaginatedProductResponse: 分页响应对象
        """
        offset = (request.page - 1) * request.limit
        total = len(products_db)
        data = products_db[offset : offset + request.limit]

        products = [
            products_pb2.Product(
                id=p["id"],
                name=p["name"],
                description=p["description"],
                price=p["price"],
                stock=p["stock"],
                category=p["category"],
                on_sale=p["on_sale"],
            )
            for p in data
        ]

        return products_pb2.PaginatedProductResponse(
            data=products, page=request.page, limit=request.limit, total=total
        )

    def GetProduct(self, request, context):
        """
        获取单个产品。

        通过产品 ID 获取完整的产品信息。

        Args:
            request (GetProductRequest): 包含 product_id
            context: gRPC 上下文

        Returns:
            Product: 产品对象

        Raises:
            RpcError: 产品不存在时返回 NOT_FOUND
        """
        for p in products_db:
            if p["id"] == request.product_id:
                return products_pb2.Product(
                    id=p["id"],
                    name=p["name"],
                    description=p["description"],
                    price=p["price"],
                    stock=p["stock"],
                    category=p["category"],
                    on_sale=p["on_sale"],
                )

        context.set_code(grpc.StatusCode.NOT_FOUND)
        context.set_details("Product not found")
        return products_pb2.Product()

    def CreateProduct(self, request, context):
        """
        创建新产品。

        在数据库中创建新产品并返回创建的对象（包含自动生成的 ID）。

        Args:
            request (CreateProductRequest): 产品信息
            context: gRPC 上下文

        Returns:
            Product: 创建的产品对象（含 ID）
        """
        new_id = max((p["id"] for p in products_db), default=0) + 1
        new_product = {
            "id": new_id,
            "name": request.name,
            "description": request.description,
            "price": request.price,
            "stock": request.stock,
            "category": request.category,
            "on_sale": False,
        }
        products_db.append(new_product)

        return products_pb2.Product(**new_product)

    def UpdateProduct(self, request, context):
        """
        更新产品信息。

        根据产品 ID 更新其他字段。

        Args:
            request (Product): 更新后的产品对象
            context: gRPC 上下文

        Returns:
            Product: 更新后的产品
        """
        for i, p in enumerate(products_db):
            if p["id"] == request.id:
                products_db[i] = {
                    "id": request.id,
                    "name": request.name,
                    "description": request.description,
                    "price": request.price,
                    "stock": request.stock,
                    "category": request.category,
                    "on_sale": request.on_sale,
                }
                return request

        context.set_code(grpc.StatusCode.NOT_FOUND)
        context.set_details("Product not found")
        return products_pb2.Product()

    def DeleteProduct(self, request, context):
        """删除产品"""
        for p in products_db:
            if p["id"] == request.product_id:
                products_db.remove(p)
                return products_pb2.Empty()

        context.set_code(grpc.StatusCode.NOT_FOUND)
        context.set_details("Product not found")
        return products_pb2.Empty()

    def SearchProducts(self, request, context):
        """
        搜索产品。

        根据搜索条件和价格范围筛选产品。

        Args:
            request (SearchProductRequest): 包含搜索条件
            context: gRPC 上下文

        Returns:
            PaginatedProductResponse: 搜索结果
        """
        results = []
        for p in products_db:
            # 匹配关键词
            if request.query and request.query.lower() not in p["name"].lower():
                continue

            # 匹配分类
            if request.category and p["category"] != request.category:
                continue

            # 匹配价格范围
            if request.min_price and p["price"] < request.min_price:
                continue
            if request.max_price and p["price"] > request.max_price:
                continue

            results.append(p)

        products = [
            products_pb2.Product(
                id=p["id"],
                name=p["name"],
                description=p["description"],
                price=p["price"],
                stock=p["stock"],
                category=p["category"],
                on_sale=p["on_sale"],
            )
            for p in results
        ]

        return products_pb2.PaginatedProductResponse(
            data=products, page=1, limit=len(results), total=len(results)
        )

    def StreamProducts(self, request, context):
        """
        流式获取产品列表。

        使用 gRPC 流式响应逐个返回产品（高效处理大数据集）。

        Args:
            request (PaginationRequest): 分页参数
            context: gRPC 上下文

        Yields:
            Product: 逐个产品对象
        """
        for p in products_db:
            yield products_pb2.Product(
                id=p["id"],
                name=p["name"],
                description=p["description"],
                price=p["price"],
                stock=p["stock"],
                category=p["category"],
                on_sale=p["on_sale"],
            )


def serve():
    """启动 gRPC 服务器"""
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    products_pb2_grpc.add_ProductServiceServicer_to_server(ProductServicer(), server)
    server.add_insecure_port("[::]:50051")
    print("gRPC 产品服务启动在 localhost:50051")
    server.start()
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
```

### 第 4 步：实现 gRPC 客户端 (client.py)

```python
"""
gRPC 产品服务客户端
演示如何调用 gRPC 服务
"""

import grpc
import products_pb2
import products_pb2_grpc


def run():
    """运行客户端测试"""
    # 连接到服务器
    channel = grpc.insecure_channel("localhost:50051")
    stub = products_pb2_grpc.ProductServiceStub(channel)

    # 测试 1: 获取产品列表
    print("=== 测试 1: 获取产品列表 ===")
    response = stub.ListProducts(products_pb2.PaginationRequest(page=1, limit=10))
    for product in response.data:
        print(f"ID: {product.id}, 名称: {product.name}, 价格: ${product.price}")

    # 测试 2: 获取单个产品
    print("\n=== 测试 2: 获取单个产品 ===")
    response = stub.GetProduct(products_pb2.GetProductRequest(product_id=1))
    print(f"产品: {response.name}, 描述: {response.description}")

    # 测试 3: 创建产品
    print("\n=== 测试 3: 创建产品 ===")
    new_product = stub.CreateProduct(
        products_pb2.CreateProductRequest(
            name="Wireless Mouse",
            description="2.4GHz wireless mouse",
            price=29.99,
            stock=200,
            category=products_pb2.ELECTRONICS,
        )
    )
    print(f"创建产品: ID={new_product.id}, 名称={new_product.name}")

    # 测试 4: 搜索产品
    print("\n=== 测试 4: 搜索产品 ===")
    response = stub.SearchProducts(
        products_pb2.SearchProductRequest(
            query="Laptop", min_price=500, max_price=2000
        )
    )
    print(f"搜索结果数: {len(response.data)}")

    # 测试 5: 流式获取产品
    print("\n=== 测试 5: 流式获取产品 ===")
    stream_response = stub.StreamProducts(
        products_pb2.PaginationRequest(page=1, limit=100)
    )
    count = 0
    for product in stream_response:
        count += 1
    print(f"流式接收了 {count} 个产品")

    channel.close()


if __name__ == "__main__":
    run()
```

---

## 📊 gRPC vs REST API 对比

| 维度 | gRPC | REST API |
|------|------|---------|
| **定义方式** | .proto 文件 | Swagger/OpenAPI |
| **数据格式** | 二进制 Protobuf | JSON/XML |
| **传输协议** | HTTP 2.0 | HTTP 1.1 |
| **流式传输** | 原生支持 | 需要 WebSocket 或轮询 |
| **性能** | 高（~5-7x 更快） | 较低 |
| **文件大小** | 小（~3-10x 更小） | 较大 |
| **浏览器支持** | 差（需要 gRPC-Web） | 好 |
| **文档生成** | 从 .proto 自动生成 | 需要 Swagger/OpenAPI |
| **学习曲线** | 陡峭 | 平缓 |
| **适用场景** | 微服务、高性能 | 公共 API、Web |

---

## 🔧 运行 gRPC 应用

### 安装依赖

```bash
pip install grpcio grpcio-tools
```

### 编译 Protobuf

```bash
python -m grpc_tools.protoc \
  -I. \
  --python_out=. \
  --grpc_python_out=. \
  products.proto
```

### 运行服务器

```bash
python server.py
# 输出: gRPC 产品服务启动在 localhost:50051
```

### 运行客户端（另一个终端）

```bash
python client.py
```

---

## 📚 从 Proto 文件生成文档

### 方法 1: 直接使用 Proto 文件作为文档

```protobuf
// 完整的 .proto 文件本身就是文档
// 它定义了所有的数据结构、服务和方法
```

### 方法 2: 使用 protodoc 生成 HTML

```bash
# 安装 protodoc
go install github.com/pseudomuto/protoc-gen-doc/cmd/protoc-gen-doc@latest

# 生成 HTML 文档
protoc \
  --doc_out=./docs \
  --doc_opt=html,products.html \
  products.proto
```

### 方法 3: 使用 buf 生成文档

```bash
# 安装 buf
brew install bufbuild/buf/buf

# 生成文档
buf generate --template=buf.gen.yaml
```

---

## 💡 gRPC 最佳实践

1. **清晰的 Proto 注释**
   ```protobuf
   message Product {
     // 产品的唯一标识符（自动生成，不可修改）
     int32 id = 1;
     
     // 产品名称（必需，最多 100 字符）
     string name = 2;
   }
   ```

2. **使用枚举而不是魔法数字**
   ```protobuf
   enum Status {
     STATUS_UNSPECIFIED = 0;  // 始终从 0 开始
     ACTIVE = 1;
     INACTIVE = 2;
   }
   ```

3. **字段编号不要重用**
   ```protobuf
   // ✅ 好
   message Product {
     int32 id = 1;
     string name = 2;
     // 如果删除 price，编号 3 不要给其他字段用
     float price = 3 [deprecated = true];
   }
   ```

---

## ✅ 学习检查清单

完成本部分后，你应该能够：

- [ ] 理解 Protocol Buffers 的语法和概念
- [ ] 编写 .proto 文件定义服务和消息
- [ ] 使用 protoc 编译器生成 Python gRPC 代码
- [ ] 实现 gRPC 服务和客户端
- [ ] 理解流式传输（streaming）的使用场景
- [ ] 从 .proto 文件生成文档
- [ ] 对比 gRPC vs REST API 的优缺点

---

**总耗时**: 60-90 分钟  
**下一步**: Part 3 - GraphQL + Schema（自描述 API）  
**预计完成时间**: 2026-04-15 下午
