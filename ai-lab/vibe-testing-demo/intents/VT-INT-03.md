# VT-INT-03：三次失败后锁定

- 前置条件：打开 v1，使用全新浏览器上下文。
- 操作：输入演示账号 `demo` 和错误密码 `wrong`，连续提交三次；随后输入正确密码 `password` 再次提交。
- 预期：第三次失败后显示 `Account locked`；正确密码也不能解锁，状态仍为 `Account locked`。
