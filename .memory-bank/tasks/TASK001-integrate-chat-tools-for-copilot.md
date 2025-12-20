# [TASK001] - 为Copilot集成Chat Tools支持

**状态:** 待办  
**添加时间:** 2025-12-21  
**更新时间:** 2025-12-21

## 原始需求

当前插件无法与VSCode内置的Copilot编程助手很好地结合，Copilot无法直接调用工具对C51项目进行操作。

**目标**: 为插件增加ChatTool，将编译、项目管理等能力作为对话工具开放给LLM，使LLM能够自主完成"编写-编译-修复"的开发流程。

## 技术要点

### 现有编译流程
1. `Target.build()` 通过 `vscode.ProcessExecution` 异步执行UV4.exe编译
2. 编译完成后触发 `onDidEndTaskProcess` 事件
3. `Target.processDiagnostics()` 解析日志并发布到 `diagnosticCollection`
4. UV4支持通过`-t`参数直接指定目标编译，无需切换活动目标

### VSCode Chat Tools API

#### 核心接口
- `vscode.lm.registerTool(name, tool)` - 注册工具
- `LanguageModelTool.invoke(options, token)` - 执行工具
- `LanguageModelChatTool` - 工具元数据（name, description, inputSchema）
- 工具命名规范: `{extensionId}_{toolName}`

### 实现工具

1. **`keil-assistant_buildProject`** - 编译项目
   - **参数**: 
     - `target` (可选): 目标名称,默认当前活动目标
     - `rebuild` (可选): 是否重新编译,默认false
   - **返回**: 
     ```typescript
     {
       success: boolean,
       exitCode: number,
       target: string,
       errors: Array<{file, line, severity, code, message}>,
       errorCount: number,
       warningCount: number,
       logFile: string
     }
     ```
   - **实现要点**: UV4通过`-t`参数直接编译指定目标,无需切换活动目标

2. **`keil-assistant_getProjectInfo`** - 获取项目信息
   - **参数**: 无
   - **返回**: 
     ```typescript
     {
       projectName: string,
       projectPath: string,
       projectType: 'C51'|'C251'|'ARM',
       activeTarget: string,
       targets: Array<{name, description}>,
       sourceFiles: Array<string>
     }
     ```

### 架构设计

### 架构设计

```
src/
├── extension.ts           (注册工具)
├── chatTools/             (新增)
│   ├── index.ts          (工具注册入口)
│   ├── tools/            (具体工具实现)
│   │   ├── BuildTool.ts
│   │   └── GetProjectInfoTool.ts
│   └── types.ts          (类型定义)
```

#### 核心实现

```typescript
// 抽象基类
abstract class KeilChatTool implements vscode.LanguageModelTool {
  abstract name: string;
  abstract description: string;
  abstract inputSchema: object;
  abstract invoke(options, token): Promise<vscode.LanguageModelToolResult>;
}

// BuildTool关键逻辑
async invoke(options, token) {
  const { target, rebuild } = options.input;
  const project = this.getActiveProject();
  const targetObj = target ? project.getTargetByName(target) : project.activeTarget;
  
  // 创建Promise等待编译完成
  const buildPromise = new Promise((resolve) => {
    const disposable = vscode.tasks.onDidEndTaskProcess((event) => {
      if (event.execution.task.definition.targetName === targetObj.targetName) {
        disposable.dispose();
        resolve({ exitCode: event.exitCode, target: targetObj });
      }
    });
    setTimeout(() => reject(new Error('Timeout')), 300000);
  });
  
  // 启动编译并等待
  rebuild ? targetObj.rebuild() : targetObj.build();
  const result = await buildPromise;
  
  // 提取诊断信息并返回
  await result.target.processDiagnostics();
  return this.formatResult(this.extractDiagnostics(result.target));
}
```

### 代码修改点

### 代码修改点

1. **extension.ts** - 在`activate()`中注册工具

2. **Target类** (C51Target/C251Target/ArmTarget)
   - 添加`lastDiagnostics`实例变量
   - 在`processDiagnostics()`中保存诊断结果
   - 添加`getLastDiagnostics()`方法

3. **KeilProject类**
   - 添加获取所有目标的便捷方法

## 实施计划

### 阶段1: 基础框架搭建 (估计2-3小时)
- [ ] 1.1 创建chatTools目录结构
- [ ] 1.2 实现KeilChatTool抽象基类
- [ ] 1.3 定义通用类型和接口
- [ ] 1.4 在extension.ts中添加工具注册代码

### 阶段2: 核心工具实现 (估计3-4小时)
- [ ] 2.1 实现BuildTool
  - [ ] 2.1.1 定义输入输出schema(target参数可选)
  - [ ] 2.1.2 实现异步编译等待逻辑(监听onDidEndTaskProcess)
  - [ ] 2.1.3 支持通过target参数编译指定目标
  - [ ] 2.1.4 格式化编译结果(包含错误列表)
  - [ ] 2.1.5 添加超时和错误处理
- [ ] 2.2 在Target类中添加诊断信息提取
  - [ ] 2.2.1 添加 `lastDiagnostics` 实例变量
  - [ ] 2.2.2 在 `processDiagnostics()` 中保存诊断结果
  - [ ] 2.2.3 添加 `getLastDiagnostics()` 公开方法
- [ ] 2.3 实现GetProjectInfoTool
  - [ ] 2.3.1 收集项目基本信息(名称、类型、路径)
  - [ ] 2.3.2 收集所有目标列表和活动目标
  - [ ] 2.3.3 收集源文件列表
  - [ ] 2.3.4 格式化输出为结构化JSON

### 阶段3: 集成和测试 (估计3-4小时)
- [ ] 3.1 与现有代码集成
- [ ] 3.2 端到端测试
  - [ ] 3.2.1 测试编译默认目标
  - [ ] 3.2.2 测试编译指定目标
  - [ ] 3.2.3 测试rebuild参数
  - [ ] 3.2.4 测试错误信息提取和格式化
  - [ ] 3.2.5 测试多项目场景
  - [ ] 3.2.6 测试getProjectInfo工具

### 阶段4: 文档和发布 (估计2小时)
- [ ] 4.1 更新README.md
- [ ] 4.2 添加Chat Tools使用示例
- [ ] 4.3 更新CHANGELOG.md
- [ ] 4.4 准备发布说明

**预计总工时**: 8-12小时

## 进度跟踪

**总体状态:** 未开始 - 0%

### 子任务

| ID | 描述 | 状态 | 更新时间 | 备注 |
|----|------|------|----------|------|
| 1.1 | 创建chatTools目录结构 | 未开始 | - | - |
| 1.2 | 实现KeilChatTool抽象基类 | 未开始 | - | - |
| 1.3 | 定义通用类型和接口 | 未开始 | - | - |
| 1.4 | 在extension.ts中添加工具注册代码 | 未开始 | - | - |
| 2.1 | 实现BuildTool | 未开始 | - | - |
| 2.2 | 在Target类中添加诊断信息提取 | 未开始 | - | - |
| 2.3 | 实现GetProjectInfoTool | 未开始 | - | - |
| 3.1 | 与现有代码集成 | 未开始 | - | - |
| 3.2 | 端到端测试 | 未开始 | - | - |
| 3.4 | 错误处理完善 | 未开始 | - | - |
| 4.1 | 更新README.md | 未开始 | - | - |
| 4.2 | 添加Chat Tools使用示例 | 未开始 | - | - |
| 4.3 | 更新CHANGELOG.md | 未开始 | - | - |
| 4.4 | 准备发布说明 | 未开始 | - | - |

## 进度日志

### 2025-12-21
- 任务创建
- 完成VSCode Chat Tools API技术调研
- 制定实施计划
- 文档优化,精简冗余思考过程

---

## 技术参考

### VSCode API
- `vscode.lm.registerTool()` - 注册Language Model工具
- `LanguageModelTool` - 工具实现接口
- `LanguageModelToolInvocationOptions<T>` - 工具调用选项
- `LanguageModelToolResult` - 工具返回结果

### 相关文件
- `src/extension.ts` - 扩展入口
- `lib/node_utility/keilProj.ts` - KeilProject类
- `lib/node_utility/C51Target.ts` - C51Target类
- `lib/node_utility/C251Target.ts` - C251Target类  
- `lib/node_utility/ArmTarget.ts` - ArmTarget类
