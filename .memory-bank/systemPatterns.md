# 系统架构模式

## 整体架构

### 架构图

```
┌────────────────────────────────────────────────────────────────┐
│                    VS Code Extension Host                      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              Extension Entry (extension.ts)              │ │
│  │  - activate()   激活扩展并初始化所有组件                │ │
│  │  - deactivate() 清理资源                                 │ │
│  └──────────────────┬───────────────────────────────────────┘ │
│                     │                                           │
│  ┌──────────────────┴───────────────────────────────────────┐ │
│  │         Core Components (核心组件层)                     │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  ProjectExplorer (项目管理器)                      │ │ │
│  │  │  - TreeDataProvider实现                            │ │ │
│  │  │  - 管理所有打开的项目                               │ │ │
│  │  │  - 处理项目视图刷新                                 │ │ │
│  │  │  - 维护活动项目状态                                 │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  ResourceManager (资源管理器)                      │ │ │
│  │  │  - 单例模式                                         │ │ │
│  │  │  - 管理扩展资源（图标、可执行文件）                │ │ │
│  │  │  - 读取用户配置                                     │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  DiagnosticCollection (诊断收集器)                 │ │ │
│  │  │  - 管理编译错误和警告                               │ │ │
│  │  │  - 发布到VS Code Problems面板                      │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │         Project Layer (项目层)                           │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  KeilProject (Keil项目类)                          │ │ │
│  │  │  - 解析.uvproj(x)文件                              │ │ │
│  │  │  - 管理项目所有Target                               │ │ │
│  │  │  - 监控项目文件变化                                 │ │ │
│  │  │  - 管理项目级日志                                   │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  Target (抽象基类)                                  │ │ │
│  │  │  ├─ C51Target   (C51项目目标)                      │ │ │
│  │  │  ├─ C251Target  (C251项目目标)                     │ │ │
│  │  │  └─ ArmTarget   (ARM项目目标)                      │ │ │
│  │  │                                                      │ │ │
│  │  │  - 管理编译配置                                     │ │ │
│  │  │  - 执行构建任务                                     │ │ │
│  │  │  - 处理诊断信息                                     │ │ │
│  │  │  - 更新C/C++配置                                    │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  FileGroup & Source (文件组和源文件)               │ │ │
│  │  │  - 表示项目文件结构                                 │ │ │
│  │  │  - 实现IView接口                                    │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │         Utility Layer (工具层)                           │ │
│  │                                                            │ │
│  │  ┌─────────────┬─────────────┬─────────────┬──────────┐ │ │
│  │  │   File      │ FileWatcher │    Time     │ Utility  │ │ │
│  │  │  文件操作   │  文件监控   │  时间工具   │ 其他工具 │ │ │
│  │  └─────────────┴─────────────┴─────────────┴──────────┘ │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  CmdLineHandler (命令行处理)                        │ │ │
│  │  │  - 构建命令行参数                                   │ │ │
│  │  │  - 处理引号和转义                                   │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │ 调用
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               External Tools (外部工具)                         │
│                                                                  │
│  ┌────────────────────┐    ┌────────────────────┐              │
│  │  UV4.exe           │    │  Uv4Caller.exe     │              │
│  │  (Keil编译器)      │◄───│  (包装器)          │              │
│  └────────────────────┘    └────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## 核心设计模式

### 1. 单例模式 (Singleton)

**使用场景**：ResourceManager

```typescript
class ResourceManager {
    private static instance: ResourceManager;
    
    static getInstance(context?: vscode.ExtensionContext): ResourceManager {
        if (_instance === undefined) {
            if (context) {
                _instance = new ResourceManager(context);
            } else {
                throw Error('context can\'t be undefined');
            }
        }
        return _instance;
    }
}
```

**优势**：
- 全局访问扩展资源
- 确保配置一致性
- 节省内存

### 2. 工厂模式 (Factory)

**使用场景**：Target类实例化

```typescript
static async getInstance(
    prjInfo: KeilProjectInfo, 
    uvInfo: uVisonInfo, 
    targetDOM: any
): Promise<Target> {
    // 根据项目类型创建对应的Target子类
    const isC51 = targetDOM['TargetOption']['Target51'];
    const isC251 = targetDOM['TargetOption']['Target251'];
    const isArm = targetDOM['TargetOption']['TargetArmAds'];
    
    if (isC251) return new C251Target(...);
    if (isC51) return new C51Target(...);
    if (isArm) return new ArmTarget(...);
    
    // 无法识别时提示用户
    const selection = await vscode.window.showQuickPick([...]);
    return selection.target === 'C51' 
        ? new C51Target(...) 
        : new ArmTarget(...);
}
```

**优势**：
- 封装实例化逻辑
- 支持运行时类型选择
- 易于扩展新类型

### 3. 观察者模式 (Observer)

**使用场景**：项目文件变化监控

```typescript
class KeilProject {
    protected _event: event.EventEmitter;
    protected watcher: FileWatcher;
    
    constructor() {
        this._event = new event.EventEmitter();
        this.watcher = new FileWatcher(this.uvprjFile);
        
        this.watcher.OnChanged = () => {
            if (防抖检查通过) {
                this.onReload();
            }
        };
        
        this.watcher.Watch();
    }
    
    on(event: 'dataChanged', listener: () => void): void {
        this._event.on(event, listener);
    }
}
```

**优势**：
- 解耦文件监控和视图更新
- 自动响应外部变化
- 支持多个观察者

### 4. 策略模式 (Strategy)

**使用场景**：不同项目类型的编译策略

```typescript
abstract class Target {
    abstract getBuildCommand(): string[];
    abstract getSystemIncludes(): string[] | undefined;
    abstract getDiagnosticRegex(): RegExp;
}

class C51Target extends Target {
    getBuildCommand() {
        return [..., `-j${Math.min(cpus, 4)}`];  // C51限制并行度
    }
    
    getDiagnosticRegex() {
        return /^([^()]+)\(([\d]+)\):\s+(error|warning):\s+(#\d+):\s+(.+)$/i;
    }
}

class ArmTarget extends Target {
    getBuildCommand() {
        return [..., `-j${cpus}`];  // ARM使用全部核心
    }
    
    getDiagnosticRegex() {
        return /^([^()]+)\(([\d]+)\):\s+(error|warning):\s+#([\d\w-]+):\s+(.+)$/i;
    }
}
```

**优势**：
- 支持多种项目类型
- 易于添加新类型
- 类型特定优化

### 5. 适配器模式 (Adapter)

**使用场景**：Keil命令行接口封装

```typescript
class Target {
    private runTask(name: string, commands: string[]) {
        const task = new vscode.Task(
            { type: 'keil-task', prjID: this.prjID, targetName: this.targetName },
            vscode.TaskScope.Workspace,
            name,
            'keil-assistant'
        );
        
        task.execution = new vscode.ProcessExecution(
            builderExe,  // Uv4Caller.exe适配UV4.exe
            args,
            { cwd: this.project.uvprjFile.dir }
        );
        
        vscode.tasks.executeTask(task);
    }
}
```

**优势**：
- 统一接口调用Keil工具
- 处理路径和参数转换
- 捕获输出和错误

### 6. 模板方法模式 (Template Method)

**使用场景**：项目加载流程

```typescript
abstract class Target {
    async load(): Promise<void> {
        // 1. 检查项目有效性
        const err = this.checkProject(this.targetDOM);
        if (err) throw err;
        
        // 2. 提取配置（子类实现）
        const incListStr = this.getIncString(this.targetDOM);
        const defineListStr = this.getDefineString(this.targetDOM);
        const sysIncludes = this.getSystemIncludes(this.targetDOM);
        
        // 3. 处理包含路径
        this.includes.clear();
        incList.forEach(path => {
            this.includes.add(this.project.toAbsolutePath(path));
        });
        
        // 4. 处理宏定义
        this.defines.clear();
        defineListStr.split(/,|\s+/).forEach(define => {
            this.defines.add(define);
        });
        
        // 5. 处理文件组
        // ...
        
        // 6. 更新C/C++配置
        this.updateCppProperties();
    }
    
    protected abstract getIncString(target: any): string;
    protected abstract getDefineString(target: any): string;
    protected abstract getSystemIncludes(target: any): string[] | undefined;
}
```

**优势**：
- 定义统一流程框架
- 强制子类实现关键步骤
- 复用公共逻辑

## 关键数据流

### 1. 项目加载流程

```
用户打开工作区
  ↓
扩展激活 → activate()
  ↓
ProjectExplorer.loadWorkspace()
  ↓
扫描工作区寻找.uvproj(x)文件
  ├─ 使用vscode.workspace.findFiles()
  ├─ 应用排除列表过滤
  └─ 检查自定义位置列表
  ↓
检测项目类型（C51/C251/ARM）
  ↓
验证对应的UV4路径配置
  ↓
创建KeilProject实例
  ├─ 生成唯一prjID (MD5)
  ├─ 创建项目存储目录（globalStorage/prjID）
  ├─ 设置文件监控
  └─ 初始化日志
  ↓
KeilProject.load()
  ├─ 解析XML项目文件
  ├─ 为每个Target创建实例
  └─ Target.load() 提取配置
  ↓
生成c_cpp_properties.json
  ↓
应用C/C++配置
  ↓
ProjectExplorer视图显示项目
  ↓
状态栏按钮可见
```

### 2. 编译流程

```
用户点击"Build"按钮
  ↓
触发命令 'keil.build'
  ↓
获取当前活动Target
  ↓
Target.build()
  ↓
构建编译命令
  ├─ 检测CPU核心数
  ├─ 计算并行度（-j参数）
  └─ 组装UV4命令行参数
  ↓
Target.runTask('build', commands)
  ├─ 检查WSL环境（报错退出）
  ├─ 创建VS Code Task
  ├─ 设置ProcessExecution
  │   └─ 执行: Uv4Caller.exe → UV4.exe
  ├─ 清空之前的诊断信息
  └─ 执行任务
  ↓
编译输出显示在终端
  ↓
任务完成触发onDidEndTaskProcess
  ↓
Target.processDiagnostics()
  ├─ 读取uv4.log文件
  ├─ 使用正则表达式匹配错误/警告
  ├─ 规范化文件路径
  │   └─ 相对路径 → 绝对路径
  ├─ 创建Diagnostic对象
  └─ 发布到DiagnosticCollection
  ↓
Problems面板显示错误
  ↓
用户点击错误跳转到源码
```

### 3. 配置同步流程

```
项目文件变化（外部修改）
  ↓
FileWatcher检测到change事件
  ↓
防抖处理（2秒内只触发一次）
  ↓
KeilProject.onReload()
  ├─ 关闭所有Target
  ├─ 清空targetList
  ├─ 重新加载项目
  └─ 通知视图更新
  ↓
Target.load()
  ├─ 重新解析XML
  ├─ 更新includes和defines
  └─ 更新c_cpp_properties.json
  ↓
C/C++ IntelliSense自动刷新
  ↓
项目视图自动更新
```

### 4. 多项目切换流程

```
用户点击"Active Project"
  ↓
ProjectExplorer.activeProject(view)
  ↓
获取要激活的KeilProject
  ↓
当前活动项目.deactive()
  ├─ 更新图标为灰色
  └─ 触发视图更新
  ↓
新项目.active()
  ├─ 更新图标为绿色
  └─ 设置为currentActiveProject
  ↓
新项目.applyActiveCppConfiguration()
  ├─ 获取活动Target
  ├─ 确保c_cpp_properties.json存在
  └─ 执行C_Cpp.ConfigurationSelect命令
  ↓
IntelliSense切换到新项目配置
  ↓
状态栏按钮更新
  ↓
视图刷新显示激活状态
```

## 路径处理策略

### 路径类型

```typescript
// 1. 项目相对路径（XML中存储的）
"..\\source\\main.c"

// 2. 工作区相对路径
"project\\source\\main.c"

// 3. 绝对路径
"C:\\Users\\Dev\\project\\source\\main.c"

// 4. URI路径
"file:///C:/Users/Dev/project/source/main.c"
```

### 路径转换流程

```
XML相对路径
  ↓
project.toAbsolutePath()
  ├─ 检查是否已是绝对路径
  ├─ 清理重复盘符（C:\\C:\\）
  └─ 相对于项目目录解析
  ↓
绝对路径
  ↓
PathUtils.toRelativePath() (可选)
  └─ 相对于工作区根目录
  ↓
工作区相对路径
```

### 特殊路径处理

```typescript
// 处理包含".."的路径
const resolvedPath = node_path.resolve(projectDir, relativePath);

// 处理包含空格的路径
const quotedPath = path.includes(' ') ? `"${path}"` : path;

// 处理重复盘符错误
const cleanPath = path.replace(/^[a-z]:\\[a-z]:\\/i, match => match.substring(0, 3));

// 规范化路径分隔符
const normalizedPath = node_path.normalize(path);
```

## 存储策略

### 项目隔离存储

```
VS Code Global Storage
└─ keil-assistant/
    ├─ {prjID1}/          # 项目1的MD5哈希
    │   ├─ keil-assistant.log
    │   ├─ uv4.log
    │   └─ uv4.log.lock
    ├─ {prjID2}/          # 项目2的MD5哈希
    │   ├─ keil-assistant.log
    │   ├─ uv4.log
    │   └─ uv4.log.lock
    └─ ...

Workspace .vscode/
└─ c_cpp_properties.json  # 共享配置文件
```

### 配置文件管理

```typescript
// C/C++配置命名规则：项目名_目标名
const cppConfigName = `${sanitize(projectName)}_${sanitize(targetName)}`;

// 配置结构
{
  "configurations": [
    {
      "name": "MyProject_Debug",       // 项目1-Debug目标
      "includePath": [...],
      "defines": [...]
    },
    {
      "name": "MyProject_Release",     // 项目1-Release目标
      "includePath": [...],
      "defines": [...]
    },
    {
      "name": "AnotherProject_Target", // 项目2-Target
      "includePath": [...],
      "defines": [...]
    }
  ],
  "version": 4
}
```

## 错误处理策略

### 分层错误处理

```
User Action
  ↓
try {
  Command Handler
    ↓
  Business Logic
    ↓
  External Call (UV4.exe)
} catch (error) {
  ├─ 日志记录 → project.logger.log()
  ├─ 用户提示 → showMessage()
  └─ 诊断发布 → diagnosticCollection.set()
}
```

### 错误分类

1. **配置错误**
   - UV4路径未配置/错误
   - 项目文件不存在
   - 处理方式：详细提示 + 配置引导

2. **解析错误**
   - XML格式错误
   - 项目类型无法识别
   - 处理方式：日志记录 + 用户选择

3. **运行时错误**
   - 编译失败
   - 文件访问失败
   - 处理方式：捕获输出 + 诊断发布

4. **环境错误**
   - WSL环境
   - 文件锁定
   - 处理方式：环境检测 + 重试机制

## 性能优化策略

### 1. 防抖机制

```typescript
// 项目文件变化防抖
if (this.prevUpdateTime === undefined ||
    this.prevUpdateTime + 2000 < Date.now()) {
    this.prevUpdateTime = Date.now();
    setTimeout(() => this.onReload(), 300);
}
```

### 2. 消息去重

```typescript
const messageDebouncer = new Map<string, number>();

function showMessage(message: string, type: string) {
    const key = `${message}-${type}`;
    const lastTime = messageDebouncer.get(key);
    
    if (lastTime && (Date.now() - lastTime) < 2000) {
        return;  // 2秒内相同消息不重复显示
    }
    
    messageDebouncer.set(key, Date.now());
    // ...显示消息
}
```

### 3. 多核编译

```typescript
const numCPUs = os.cpus().length;

// C51: 限制并行度
const jValue = Math.max(1, Math.min(numCPUs, 4));

// ARM: 充分利用
const jValue = Math.max(1, numCPUs);

// 命令: UV4 -b project.uvprojx -j{jValue}
```

### 4. 异步操作

```typescript
// 配置应用异步化
async applyActiveCppConfiguration(): Promise<void> {
    const activeTarget = this.getActiveTarget();
    if (!activeTarget) return;
    
    await activeTarget.applyCppConfigurationSelection();
}

// 项目切换异步化
async setActiveTarget(tName: string) {
    const target = this.getTargetByName(tName);
    if (!target) return;
    
    await target.applyCppConfigurationSelection();
}
```

## 可扩展性设计

### 1. 抽象类设计

```typescript
abstract class Target {
    // 模板方法（固定流程）
    async load(): Promise<void> { ... }
    
    // 抽象方法（子类实现）
    protected abstract checkProject(target: any): Error | undefined;
    protected abstract getIncString(target: any): string;
    protected abstract getBuildCommand(): string[];
    // ...
}
```

### 2. 配置扩展点

```typescript
// package.json
"configuration": {
    "KeilAssistant.C51.Uv4Path": { ... },
    "KeilAssistant.MDK.Uv4Path": { ... },
    "KeilAssistant.Project.ExcludeList": { ... },
    "KeilAssistant.Project.FileLocationList": { ... }
    // 易于添加新配置项
}
```

### 3. 命令扩展

```typescript
// 命令注册集中管理
subscriber.push(vscode.commands.registerCommand('keil.build', ...));
subscriber.push(vscode.commands.registerCommand('keil.rebuild', ...));
subscriber.push(vscode.commands.registerCommand('keil.download', ...));
// 易于添加新命令
```

### 4. 类型系统扩展

```typescript
// 添加新项目类型只需：
// 1. 创建新Target子类
class NewTypeTarget extends Target {
    // 实现抽象方法
}

// 2. 在工厂方法中添加检测逻辑
static async getInstance(...) {
    if (isNewType) return new NewTypeTarget(...);
    // ...
}
```
