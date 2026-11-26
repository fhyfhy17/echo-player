# 回声 · Echo Player

一个桌面音乐播放器，基于 Electron，支持 macOS 和 Windows。

- 在线搜索、排行榜、歌单，聚合网易云、QQ 音乐、酷我、B 站的公开接口
- 每日推荐、私人漫游（按你的听歌口味推荐）
- 同步歌词、翻译歌词、沉浸播放
- 暗色 / 明亮两套主题
- 本地音乐导入

## 下载

到 [Releases](https://github.com/fhyfhy17/echo-player/releases) 下载对应平台的安装包：

| 文件 | 平台 |
|---|---|
| `Echo-1.0.0-mac-arm64.dmg` | Apple 芯片 Mac（M1 及以后） |
| `Echo-1.0.0-mac-x64.dmg` | Intel Mac |
| `Echo-Setup-1.0.0-win-x64.exe` | Windows 10 / 11（64 位） |

安装包没有代码签名，第一次打开时系统会拦一下：

- **macOS**：在「应用程序」里右键「回声」，选「打开」，再点「打开」。
- **Windows**：SmartScreen 弹窗点「更多信息」→「仍要运行」。如果开了「智能应用控制」，未签名的程序会被直接拦截，需要先在 Windows 安全中心里关掉它。

## 从源码运行

需要 Node.js 18 或更高版本。

```bash
npm install
npm start          # 启动桌面应用
npm run check      # 跑接口自检
npm run dist:mac   # 打 macOS 安装包
npm run dist:win   # 打 Windows 安装包
```

安装包输出到 `release/` 目录。

## 致谢

- [NeteaseCloudMusicApi Enhanced](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced)：网易云接口
- [YesPlayMusic](https://github.com/qier222/YesPlayMusic)：Electron 外壳的结构参考

## 声明

本项目仅供学习交流。音乐内容的版权归各平台和版权方所有，请支持正版。

## 许可

[MIT](LICENSE)
