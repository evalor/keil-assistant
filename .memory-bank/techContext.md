# 技术上下文

## 技术栈

### 核心技术

#### 1. TypeScript
- **版本**: ES2016
- **用途**: 扩展主要开发语言
- **特性使用**:
  - 类型系统（strict模式）
  - 抽象类和接口
  - async/await异步编程
  - 装饰器模式

#### 2. Node.js
- **运行环境**: VS Code Extension Host
- **核心模块**:
  - `fs`: 文件系统操作
  - `path`: 路径处理
  - `child_process`: 执行外部命令
  - `crypto`: MD5哈希生成
  - `os`: 系统信息（CPU核心数）
  - `events`: 事件发射器

#### 3. VS Code Extension API
- **最低版本**: 1.85.0
- **主要API使用**:
  - `vscode.window`: 窗口和UI交互
  - `vscode.workspace`: 工作区管理
  - `vscode.commands`: 命令注册
  - `vscode.tasks`: 任务执行
  - `vscode.languages`: 诊断信息
  - `vscode.TreeDataProvider`: 树视图
  - `vscode.ExtensionContext`: 扩展上下文

### 依赖库

```json
{
  "dependencies": {
    "xml2js": "^0.x.x"  // XML解析（项目文件）
  },
  "devDependencies": {
    "typescript": "^4.x.x",
    "webpack": "^5.x.x",
    "ts-loader": "^9.x.x",
    "@types/node": "^16.x.x",
    "@types/vscode": "^1.85.0"
  }
}
```

### 构建工具

#### Webpack配置
```javascript
{
  target: 'node',
  entry: './src/extension.ts',
  output: {
    path: './dist',
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode',  // VS Code运行时提供
    xml2js: 'xml2js'            // 打包到node_modules
  },
  resolve: {
    extensions: ['.ts', '.js']
  }
}
```

#### TypeScript配置
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "es2016",
    "strict": true,
    "sourceMap": true,
    "outDir": "./dist"
  }
}
```

## 外部工具集成

### Keil uVision 5+

#### UV4.exe 命令行接口
```bash
# 编译项目
UV4.exe -b <project.uvprojx> -j<n> -t <target>

# 重新编译
UV4.exe -r <project.uvprojx> -j<n> -t <target>

# 下载程序
UV4.exe -f <project.uvprojx> -j0 -t <target>
```

**参数说明**:
- `-b`: Build（编译）
- `-r`: Rebuild（重新编译）
- `-f`: Flash Download（下载到设备）
- `-j<n>`: 并行任务数（0=单任务，n=n个任务）
- `-t <target>`: 指定目标名称
- `-o <logfile>`: 输出日志文件

#### Uv4Caller.exe（包装器）
- **位置**: `bin/Uv4Caller.exe`
- **作用**: 
  - 接收参数并调用实际的UV4.exe
  - 处理路径和参数转换
  - 输出重定向到日志文件

### C/C++ Extension
- **扩展ID**: `ms-vscode.cpptools`
- **依赖关系**: 可选但强烈推荐
- **集成方式**:
  - 生成 `c_cpp_properties.json`
  - 调用 `C_Cpp.ConfigurationSelect` 命令
  - 提供 IntelliSense 配置

## 项目结构

```
keil-assistant/
├─ src/                          # TypeScript源码
│   ├─ extension.ts              # 主入口（2233行）
│   │   ├─ activate()           # 扩展激活
│   │   ├─ ProjectExplorer      # 项目管理器
│   │   ├─ KeilProject          # 项目类
│   │   ├─ Target (抽象)        # 目标基类
│   │   │   ├─ C51Target        # C51实现
│   │   │   ├─ C251Target       # C251实现
│   │   │   └─ ArmTarget        # ARM实现
│   │   ├─ FileGroup           # 文件组
│   │   └─ Source              # 源文件
│   ├─ ResourceManager.ts       # 资源管理
│   └─ CmdLineHandler.ts        # 命令行处理
│
├─ lib/                         # 工具库
│   └─ node_utility/
│       ├─ File.ts              # 文件操作（444行）
│       ├─ FileWatcher.ts       # 文件监控
│       ├─ Time.ts              # 时间工具
│       └─ Utility.ts           # 通用工具
│
├─ bin/                         # 二进制文件
│   └─ Uv4Caller.exe           # UV4包装器
│
├─ res/                         # 资源文件
│   ├─ icons/                  # SVG图标
│   └─ preview/                # 预览图片
│
├─ syntaxes/                    # 语法定义
│   ├─ a51.tmLanguage.json     # A51语法
│   ├─ a51.snippets.json       # A51代码片段
│   └─ a51.language-configuration.json
│
├─ dist/                        # 编译输出
│   ├─ src/extension.js         # 编译后的主文件
│   └─ *.js.map                # Source Maps
│
├─ package.json                 # 扩展清单
├─ tsconfig.json               # TypeScript配置
├─ webpack.config.js           # Webpack配置
└─ tslint.json                 # TSLint规则
```

## 文件格式

### Keil项目文件 (.uvproj / .uvprojx)

```xml
<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<Project>
  <SchemaVersion>2.1</SchemaVersion>
  <Targets>
    <Target>
      <TargetName>Target 1</TargetName>
      <TargetOption>
        <!-- C51项目 -->
        <Target51>
          <C51>
            <VariousControls>
              <IncludePath>.\inc;.\driver</IncludePath>
              <Define>DEBUG, USE_HAL</Define>
            </VariousControls>
          </C51>
        </Target51>
        
        <!-- ARM项目 -->
        <TargetArmAds>
          <Cads>
            <VariousControls>
              <IncludePath>.\inc</IncludePath>
              <Define>STM32F103</Define>
            </VariousControls>
          </Cads>
        </TargetArmAds>
        
        <TargetCommonOption>
          <OutputDirectory>.\Objects\</OutputDirectory>
        </TargetCommonOption>
      </TargetOption>
      
      <Groups>
        <Group>
          <GroupName>Source Group</GroupName>
          <Files>
            <File>
              <FilePath>.\src\main.c</FilePath>
              <FileOption>
                <CommonProperty>
                  <IncludeInBuild>1</IncludeInBuild>
                </CommonProperty>
              </FileOption>
            </File>
          </Files>
        </Group>
      </Groups>
    </Target>
  </Targets>
</Project>
```

### C/C++ 配置文件

```json
{
  "configurations": [
    {
      "name": "ProjectName_TargetName",
      "includePath": [
        "C:/Project/inc",
        "C:/Keil_v5/ARM/ARMCLANG/include",
        "${default}"
      ],
      "defines": [
        "STM32F103",
        "DEBUG",
        "__CC_ARM",
        "__attribute__(x)=",
        "..."
      ],
      "intelliSenseMode": "${default}"
    }
  ],
  "version": 4
}
```

## 开发环境

### 必需工具
1. **Node.js**: v16.x+ (LTS)
2. **npm**: 随Node.js安装
3. **Visual Studio Code**: 最新稳定版
4. **TypeScript**: 通过npm安装

### 开发工作流

```bash
# 1. 克隆仓库
git clone https://github.com/ruiwarn/keil-assistant.git

# 2. 安装依赖
npm install

# 3. 编译
npm run webpack

# 4. 调试
# 在VS Code中按F5启动Extension Development Host

# 5. 打包发布
vsce package
```

### VS Code配置

#### tasks.json
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "npm",
      "script": "webpack",
      "group": "build"
    }
  ]
}
```

#### launch.json
```json
{
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

## 技术约束

### 平台限制

#### Windows专属
- **原因**: Keil uVision仅支持Windows
- **检测机制**:
  ```typescript
  if (vscode.env.remoteName === 'wsl') {
      showMessage('Keil Assistant 检测到WSL环境...', 'error');
      return;
  }
  ```

#### 路径处理
- **分隔符**: `\\` (Windows)
- **盘符**: 必须处理（C:, D:等）
- **空格**: 需要引号包裹
- **相对路径**: 支持 `..` 符号

### 性能约束

#### 文件监控
- **防抖时间**: 2秒
- **延迟加载**: 300ms
- **原因**: 避免频繁重载

#### 消息提示
- **自动关闭**: 1秒（成功消息）
- **去重时间**: 2秒
- **原因**: 避免消息轰炸

#### 编译并行度
- **C51项目**: min(CPU核心数, 4)
- **ARM项目**: CPU核心数
- **最小值**: 1（确保至少单核）

### 内存管理

#### 日志文件
- **位置**: globalStorage/prjID/
- **大小**: 追加模式，需定期清理
- **内容**: 编译输出、调试信息

#### 配置缓存
- **单例模式**: ResourceManager
- **事件监听**: EventEmitter
- **及时清理**: dispose方法

### 兼容性

#### Keil版本
- ✅ Keil V5 完整安装
- ✅ Keil V5 仅ARMCLANG安装
- ✅ Keil V6 (AC6目录)
- ⚠️ Keil V4 不支持

#### VS Code版本
- **最低**: 1.85.0
- **测试**: 最新稳定版
- **API**: 使用稳定API

#### 项目类型
- ✅ C51 (8051系列)
- ✅ C251 (251系列)
- ✅ ARM (ARMCC/ARMCLANG)
- ❌ 其他工具链

## 数据持久化

### 扩展配置（settings.json）

```json
{
  "KeilAssistant.C51.Uv4Path": "C:\\Keil_v5\\UV4\\UV4.exe",
  "KeilAssistant.MDK.Uv4Path": "C:\\Keil_v5\\UV4\\UV4.exe",
  "KeilAssistant.Project.ExcludeList": [
    "template.uvproj",
    "template.uvprojx"
  ],
  "KeilAssistant.Project.FileLocationList": [
    "./project",
    "./examples"
  ]
}
```

### 项目存储（globalStorage）

```
{globalStoragePath}/
└─ {prjID}/
    ├─ keil-assistant.log     # 插件日志
    ├─ uv4.log               # 编译输出
    └─ uv4.log.lock          # 锁文件（触发更新）
```

### 工作区存储（.vscode）

```
.vscode/
└─ c_cpp_properties.json     # C/C++配置
```

## 安全考虑

### 输入验证
- 路径规范化（防止路径遍历）
- XML解析安全（使用xml2js）
- 命令参数转义（防止注入）

### 文件访问
- 仅读取工作区内文件
- 配置路径需用户明确设置
- 日志文件独立存储

### 进程执行
- 使用ProcessExecution（不是ShellExecution）
- 参数数组传递（避免shell解析）
- CWD设置为项目目录

## 调试技巧

### 日志系统

```typescript
// 项目级日志
project.logger.log('[INFO] 消息内容');
project.logger.log('[ERROR] 错误信息');
project.logger.log('[DEBUG] 调试数据');

// 日志位置
// {globalStoragePath}/{prjID}/keil-assistant.log
```

### 断点调试

```typescript
// 在VS Code中设置断点
// 按F5启动Extension Development Host
// 在宿主VS Code中触发功能
// 调试器在断点处停止
```

### 输出面板

```typescript
// 任务输出
// VIEW → OUTPUT → Tasks

// 扩展日志
console.log('Extension log');
```

### 问题诊断

```typescript
// 详细路径检测日志
this.project.logger.log(`[DEBUG] ========== Path Detection Start ==========`);
this.project.logger.log(`[DEBUG] Raw UV4 Path: '${rawPath}'`);
this.project.logger.log(`[DEBUG] File exists: ${file.IsFile()}`);
// ...
```

## 测试策略

### 手动测试场景

1. **项目加载**
   - ✅ 单项目自动加载
   - ✅ 多项目选择加载
   - ✅ 项目排除过滤
   - ✅ 自定义位置加载

2. **编译测试**
   - ✅ C51项目编译
   - ✅ C251项目编译
   - ✅ ARM项目编译
   - ✅ 多核并行验证

3. **配置测试**
   - ✅ IntelliSense生效
   - ✅ 头文件路径正确
   - ✅ 宏定义生效
   - ✅ 多项目配置隔离

4. **错误处理**
   - ✅ UV4路径错误提示
   - ✅ 编译错误定位
   - ✅ 文件不存在提示
   - ✅ WSL环境检测

### 测试环境

```
测试机器配置：
- Windows 10/11
- Keil V5完整安装
- Keil V5仅ARMCLANG安装
- Keil V6安装
- 多核CPU（验证并行编译）

测试项目：
- C51小型项目
- C251项目
- ARM Cortex-M项目（STM32）
- 多Target项目
- 大型项目（性能测试）
```

## 已知限制

### 功能限制
1. ❌ 不支持调试功能
2. ❌ 不支持非Windows平台
3. ❌ 不支持Keil V4及更早版本
4. ❌ 不支持非Keil工具链

### 技术限制
1. ⚠️ XML解析依赖xml2js格式
2. ⚠️ UV4命令行接口有限
3. ⚠️ 文件监控可能有延迟
4. ⚠️ 大型项目加载较慢

### 环境限制
1. ⚠️ WSL环境不支持执行UV4
2. ⚠️ 网络驱动器性能差
3. ⚠️ 中文路径可能有问题
4. ⚠️ 需要管理员权限下载程序

## 技术债务

### 当前已知问题
1. **TypeScript迁移**
   - 部分.js文件未转换为.ts
   - 需要完全TypeScript化

2. **测试覆盖**
   - 缺少单元测试
   - 缺少集成测试
   - 需要建立测试框架

3. **代码重构**
   - extension.ts文件过大（2233行）
   - 需要拆分为多个模块
   - 改进类型定义

4. **性能优化**
   - 大型项目加载慢
   - XML解析性能待优化
   - 考虑增量加载

### 未来改进方向
1. **模块化**
   - 拆分extension.ts
   - 独立Target模块
   - 独立UI组件

2. **测试完善**
   - 单元测试框架
   - 集成测试场景
   - CI/CD集成

3. **性能提升**
   - 缓存机制
   - 懒加载策略
   - Worker线程

4. **用户体验**
   - 配置向导
   - 更多快捷操作
   - 自定义主题
