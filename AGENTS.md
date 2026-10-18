# Repository Guidelines（仓库指南）

## 项目结构与模块组织

这是一个使用 Vite、TypeScript 和 Three.js 构建的浏览器 3D 游戏。

- `index.html` 是 HTML 入口，包含 HUD、结束面板和模块脚本。
- `src/main.ts` 负责场景、城市物体、黑洞、输入、游戏循环、计分、计时和窗口缩放。
- `.env` 集中管理成长速度、相机放大系数和地图大小；修改后需重启 Vite。
- `src/config.ts` 读取 `.env` 并提供给游戏代码。
- `src/dissolve.ts` 负责建筑物使用的溶解材质和 Shader 钩子。
- `src/style.css` 负责全屏画布和 HUD 样式。
- `package.json`、`tsconfig.json` 定义脚本、依赖和严格 TypeScript 配置。
- `role.md` 记录预期玩法和实现约束。

渲染与玩法改动放在 `src/main.ts`；可复用的溶解 Shader 逻辑放在 `src/dissolve.ts`。当前没有独立的资源目录或测试目录。

## 构建、测试与开发命令

在仓库根目录运行：

```bash
npm install       # 安装依赖
npm run dev       # 启动 Vite 本地开发服务器
npm run build     # 执行 TypeScript 检查并生成 dist/
npm run preview   # 本地预览生产构建
```

开发服务器用于交互检查；提交评审前必须运行生产构建进行编译验证。

## 代码风格与命名约定

遵循现有源码：严格 TypeScript、ES 模块、两空格缩进、分号和单引号。变量与函数使用 `camelCase`，类型与类使用 `PascalCase`，Three.js 对象使用描述性名称。优先复用现有 Three.js 模式，避免无必要的抽象。CSS 保持可读，并限定在现有 HUD/画布选择器范围内。项目未配置格式化工具或 Linter，请手动保持一致。

## 测试指南

项目未配置自动化测试框架或覆盖率门槛。每次改动都运行 `npm run build`。涉及玩法或视觉效果时，还应运行 `npm run dev`，按需检查鼠标移动、吸收规则、分数和等级增长、计时结束、重新开始及窗口缩放。

## 提交与 Pull Request 指南

当前目录没有 Git 历史，因此没有既定的提交规范。建议使用简短的祈使句提交信息，并添加 `feat:`、`fix:` 或 `docs:` 前缀。Pull Request 应说明玩家可见的变化，列出验证命令，注明对渲染性能的影响；视觉改动请附截图或短视频。
