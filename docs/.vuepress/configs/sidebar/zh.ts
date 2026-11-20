import type { SidebarOptions } from 'vuepress-theme-hope'

export const zhSideBar: SidebarOptions = {
  '/': [
    {
      text: '01 · 从这里开始',
      children: [
        { text: '学习路线', link: '/guide/roadmap/' },
        { text: 'ModelBase 解决什么问题', link: '/guide/why/' },
        { text: '快速上手', link: '/guide/start/' },
        { text: '核心概念', link: '/guide/know/' },
        { text: '示例索引', link: '/guide/examples/' },
      ],
    },
    {
      text: '02 · 按步骤进阶',
      children: [
        { text: '字段映射与转换', link: '/guide/mapping/' },
        { text: '编辑、保存与还原', link: '/guide/editing/' },
        { text: '嵌套模型与集合', link: '/guide/nested/' },
        { text: '动态模型与列缓存', link: '/guide/dynamic/' },
        { text: 'Node 与 Vue 3 集成', link: '/guide/integration/' },
        { text: '可选的 service 请求层', link: '/guide/service/' },
      ],
    },
    {
      text: '03 · 模型定义参考',
      children: [
        { text: 'LLM 文档', link: '/guide/llm/' },
        { text: 'API 速查', link: '/guide/reference/' },
        { text: '模型初始化', link: '/init/' },
        { text: '字段类型', link: '/column/type/' },
        { text: '字段名称映射', link: '/column/name/' },
        { text: '输入别名', link: '/column/aliasName/' },
        { text: '嵌套模型', link: '/column/model/' },
        { text: '默认值', link: '/column/default/' },
        { text: '自动初始化', link: '/column/autowired/' },
        { text: '主键', link: '/column/primary/' },
      ],
    },
    {
      text: '04 · 转换与选择参考',
      children: [
        { text: '反序列化转换', link: '/column/formatter/' },
        { text: '序列化转换', link: '/column/unformatter/' },
        { text: '字符串清理', link: '/column/trim/' },
        { text: '字段分组', link: '/column/group/' },
        { text: '序列化模型', link: '/method/getSerializableObject/' },
        { text: '清理空值后序列化', link: '/method/getCleanSerializableObject/' },
      ],
    },
    {
      text: '05 · 变更追踪参考',
      children: [
        { text: '获取变更数据', link: '/method/getChangedData/' },
        { text: '获取变更描述', link: '/method/getChangedDescriptor/' },
        { text: '判断是否变更', link: '/method/isChanged/' },
        { text: '读取原始快照', link: '/method/getOriginalData/' },
        { text: '保存当前快照', link: '/method/saveChangedData/' },
        { text: '还原到快照', link: '/method/revertChangedData/' },
      ],
    },
    {
      text: '06 · 更新与操作参考',
      children: [
        { text: '增量更新', link: '/method/update/' },
        { text: '重置模型数据', link: '/method/setDataByOriginal/' },
        { text: '合并模型数据', link: '/method/extend/' },
        { text: '按字段名读取值', link: '/method/getColumnData/' },
        { text: '按字段名设置值', link: '/method/setColumnData/' },
        { text: '递归调用模型方法', link: '/method/callMethod/' },
      ],
    },
    {
      text: '07 · 兼容、迁移与排错',
      children: [
        { text: 'class-transformer 迁移评估', link: '/guide/class-transformer/' },
        { text: '旧式模型比较', link: '/method/isModelEqual/' },
        { text: '旧式包含关系比较', link: '/method/isContainsModel/' },
        { text: 'foreign 兼容边界', link: '/column/foreign/' },
        { text: '常见问题', link: '/guide/faq/' },
        { text: '迁移指南', link: '/guide/migrate/' },
        { text: '更新日志', link: '/guide/changelog/' },
      ],
    },
  ],
}
