import type { SidebarOptions } from 'vuepress-theme-hope'

export const zhSideBar: SidebarOptions = {
  '/': [
    {
      text: '开始使用',
      children: [
        { text: '快速上手', link: '/guide/start/' },
        { text: '核心概念', link: '/guide/know/' },
        { text: '模型初始化', link: '/init/' },
        { text: '示例索引', link: '/guide/examples/' },
        { text: '为什么选择 ModelBase', link: '/guide/why/' },
      ],
    },
    {
      text: '定义模型',
      children: [
        { text: '字段类型', link: '/column/type/' },
        { text: '字段名称映射', link: '/column/name/' },
        { text: '输入别名', link: '/column/aliasName/' },
        { text: '嵌套模型', link: '/column/model/' },
        { text: '默认值', link: '/column/default/' },
        { text: '自动初始化', link: '/column/autowired/' },
        { text: '主键', link: '/column/primary/' },
        { text: '外键关联', link: '/column/foreign/' },
      ],
    },
    {
      text: '数据转换与选择',
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
      text: '变更追踪',
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
      text: '更新与比较',
      children: [
        { text: '增量更新', link: '/method/update/' },
        { text: '重置模型数据', link: '/method/setDataByOriginal/' },
        { text: '合并模型数据', link: '/method/extend/' },
        { text: '比较模型', link: '/method/isModelEqual/' },
        { text: '判断模型包含关系', link: '/method/isContainsModel/' },
        { text: '按字段名读取值', link: '/method/getColumnData/' },
        { text: '按字段名设置值', link: '/method/setColumnData/' },
        { text: '递归调用模型方法', link: '/method/callMethod/' },
      ],
    },
    {
      text: '维护与排错',
      children: [
        { text: '常见问题', link: '/guide/faq/' },
        { text: '迁移指南', link: '/guide/migrate/' },
        { text: '更新日志', link: '/guide/changelog/' },
      ],
    },
  ],
}
