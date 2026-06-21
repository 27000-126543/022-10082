export default defineAppConfig({
  pages: [
    'pages/tasks/index',
    'pages/scan/index',
    'pages/report/index',
    'pages/progress/index',
    'pages/ranking/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#2563EB',
    navigationBarTitleText: '玻尿酸效期巡检',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F8FAFC'
  },
  tabBar: {
    color: '#94A3B8',
    selectedColor: '#2563EB',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/tasks/index',
        text: '今日任务'
      },
      {
        pagePath: 'pages/scan/index',
        text: '扫码巡检'
      },
      {
        pagePath: 'pages/report/index',
        text: '异常上报'
      },
      {
        pagePath: 'pages/progress/index',
        text: '处理进度'
      },
      {
        pagePath: 'pages/ranking/index',
        text: '门店排行'
      }
    ]
  }
})
