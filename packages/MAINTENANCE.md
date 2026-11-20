# 源码维护与后续优化

本轮审阅范围为 core、service、common 的全部 65 个生产 TypeScript 文件。
已有准确注释保留；补齐公开入口、内部状态和关键分支，纠正与实现不一致的说明。
JSON 配置、编译产物、第三方代码以及每个 demo/test 不在逐项注释范围内。

## 本轮不改变的边界

- 生产源码只调整注释，不新增 API、不改变运行分支；验证时比较去注释后的 TypeScript 编译输出。
- `new` / `create`、默认值、分组优先级、回调 this 和异常顺序沿用当前行为。
- 未声明子模型类型的对象、数组不新增追踪保证；完整边界见 `../docs/guide/faq.md`。
- service 保留 wrapper 的有状态语义、错误转换边界和同步流解析。
- 新增边界测试验证注释描述的是实际行为，而不是未来设计目标。

## 可继续优化，但需要独立验证

| 优先级 | 位置 | 方向 | 不能直接替换的原因 |
| --- | --- | --- | --- |
| 高 | core/_utils/changeTracking/proxyState.ts | 减少小模型的保存点、Map 和闭包开销 | 小对象元数据可能大于原快照；还需保持父子独立保存点和弱引用回收 |
| 高 | core/_utils/mapping/updateField.ts、changeTracking/arrayChanges.ts | 优化主键数组的双重遍历 | 重复主键会更新多项或末项匹配；复合键 join 及自定义方法调用顺序属于现有行为 |
| 中 | core/model/ModelBase.ts 的 getColumns/getPrimaryKey | 减少重复元数据合并，整理不可达兼容分支 | 动态列、子类覆盖和元数据继承不能简单统一成静态缓存 |
| 中 | core/_utils/changeTracking/proxyState.ts 的 capture | 减少深层模型初始化时的重复关系遍历 | 不能引入每次子节点修改都通知所有祖先的额外写入成本 |
| 中 | service 公共类型 | 让 ArrayWrapper/RecordArrayWrapper 类型更贴近实际数组结果，统一 del 参数声明 | 修正公开泛型或签名可能影响现有 TypeScript 调用方，不应夹带在注释修改中 |

收益需用现有 Node 基准和真实数据验证，不以“代码更短”替代性能证据。
特别是不缓存复杂值的 JSON 比较结果，也不改为简单引用比较；getter/toJSON、属性顺序及异常行为可能改变。

## 注释纠正实例

- `deepCopy` 仅递归对象分支，嵌套数组保留引用，不是完整 cloneDeep。
- `Column` 不读取 TypeScript 反射类型，子模型仍需显式声明。
- `getValueByPath` 中间路径不可达返回 null，但缺失末级键可以返回 undefined。
- `isType` 只检查函数，不证明能 new；UUID 工具不是密码学安全随机数。
- `dynamicModelBase` 会原地归一化列配置，每次返回新类；当前类配置只消费 methods。
- `ServiceResponse.create(dto, wrapper)` 的第二参数不是 options。
- `camelCaseKey: true` 的历史行为是保留原键，不按字段名猜测相反语义。

## 阅读顺序

core 从 ModelBase 的创建入口进入 mapping，再阅读 proxyState 和序列化/变更聚合。
service 从 CoreService 的请求生命周期进入 _internal，最后看各个 Wrapper。
common 的 debounce 是调度状态机，throttle 通过设置 maxWait 复用它。

## 本轮验证

- 65 个生产 TypeScript 文件去除注释后的编译输出哈希与本轮开始时一致。
- 具名函数、类和方法的 AST 检查未发现缺失 JSDoc；此检查不等于逐行注释覆盖率。
- 新增 10 个边界用例；全仓 96 个套件、358 个测试通过，保留 2 个既有 TODO。
- packages 范围 TypeScript 检查及 git diff --check 通过。
