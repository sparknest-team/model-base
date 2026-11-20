---
permalink: /guide/migrate/
---

# 迁移检查清单

本页用于升级已有 ModelBase 项目；从 class-transformer 迁移请阅读[能力对照](/guide/class-transformer/)。
功能是否已发布，以实际安装版本和[更新日志](/guide/changelog/)为准。

让 AI 检查已有业务项目时，可提供[本轮升级校验记录](/modelbase-upgrade-audit.txt)。它包含行为变化、搜索命令和验证矩阵，应结合项目实际安装版本执行。

## 1. 先固定项目现有行为

记录典型 DTO 的输入、输出、空值、分组、默认值及回滚结果。升级后对照测试，不只比较方法名。

## 2. 统一创建方式

优先使用 Model.create。默认值移到 Column.default，对象/数组使用工厂。
不再依赖 emitDecoratorMetadata，子模型使用 model/childType 显式声明。
保留项目采用的装饰器编译模式，不同时切换库版本和所有编译选项。

## 3. 转换回调逐项迁移

formatter → deserialize，unformatter → serialize。
旧回调的 key/data/columns 与新回调的 name/property/serializeData 或 deserializeData 不完全一致，
不能只进行字符串替换。新回调详见[输入转换](/column/formatter/)和[输出转换](/column/unformatter/)。

## 4. 明确名称与分组

name 控制规范名称，aliasName 接收额外输入名；strictNameCheck/strictAliasNameCheck 保留严格名称。
group 优先于 excludeGroup，未分组字段仍保留。名称变化可能影响历史 DTO，不做自动结构迁移。

## 5. 明确快照开关

优先使用 enableSnapshot，enableDataState 继续兼容，同层新名称优先。
false 时不会保存/还原，也不会给出有效变更查询。
标准模型树使用延迟快照；未声明子模型类型的对象内部修改不属于自动追踪保证。

## 6. 检查更新与保存

update 自动保存新基准。用户编辑应直接赋值。
setDataByOriginal 默认保存，keepBackUp: true 保留旧基准。
getOriginalData 返回可变引用，不应被无意修改。

## 7. 检查动态定义和继承

dynamicModelBase 生成的类按静态结构缓存；columnsInValue 仍实时推断。
运行时注册使用 ColumnDefine，不改内部元数据或共享缓存。继承、同名覆盖和多实例数据需要独立 case。

## 8. service 项目额外检查

CoreService 接收 Driver，而不是裸 HTTP 客户端。ServiceResponse.create 第二参数是 wrapper，不是模型 options。
客户端返回格式、业务成功码、请求钩子和 wrapper 并发状态请按[service 指南](/guide/service/)逐项验证。

[迁移后运行完整示例](/guide/examples/) · [更新日志](/guide/changelog/)
