# K001 - Keil UV4 命令行工具使用指南

## 概述
Keil UV4 命令行工具允许从命令行调用 μVision IDE，用于构建项目、启动调试器或下载程序到 Flash 存储器。该命令适用于项目文件（.uvproj）和多项目文件（.uvmpw）。

## 基本语法
```
UV4 [command] [projectfile] [options]
```

- **command**: 命令参数（可选）
- **projectfile**: 项目文件名（可选）
- **options**: 附加参数（可选）

## 可用命令

### 构建相关命令
| 命令 | 描述 | 示例 |
|------|------|------|
| `-b` | 构建项目并在构建完成后退出 | `UV4 -b PROJECT1.uvproj` |
| `-r` | 重新翻译项目并在构建完成后退出 | `UV4 -r PROJECT1.uvproj -t "Simulator"` |
| `-z` | 重新构建项目的所有目标 | `UV4 -b PROJECT1.uvproj -z -o "c:\temp\log.txt"` |
| `-q` | 重新构建多项目中选定的目标 | `UV4 -r "C:\Keil\ARM\Example-mpw.uvmpw" -q -o "c:\temp\log.txt"` |

### 调试和下载命令
| 命令 | 描述 | 示例 |
|------|------|------|
| `-d` | 以调试模式启动 μVision | `UV4 -d PROJECT1.uvproj` |
| `-f` | 下载程序到 Flash 并在下载完成后退出 | `UV4 -f Programming.UVPROJ -o Prg_Output.txt` |

### 项目管理命令
| 命令 | 描述 | 示例 |
|------|------|------|
| `-i import_file.xml` | 使用 XML 文件创建或更新项目 | `UV4 MyProject.uvproj -i MyImport.xml` |
| `-n device_name` | 创建新项目并指定设备名称 | `UV4 -n "STM32F103C8"` |

## 常用选项

| 选项 | 描述 | 示例 |
|------|------|------|
| `-t "target_name"` | 指定目标名称 | `UV4 -r PROJECT1.uvproj -t "MCB2100 Board"` |
| `-o outputfile` | 指定输出日志文件 | `UV4 -r PROJECT1.uvproj -o "listmake.prn"` |
| `-j0` | 隐藏 μVision GUI，消息被抑制，用于批处理测试 | `UV4 -b PROJECT1.uvproj -j0` |
| `-x` | 启用 DDE 模式并返回完整命令输出（仅与 `-d` 一起使用） | `UV4 -d PROJECT1.uvproj -x` |
| `-y` | 启用 DDE 模式并仅返回命令确认（仅与 `-d` 一起使用） | `UV4 -d PROJECT1.uvproj -y` |

## 返回代码 (ERRORLEVEL)
构建过程完成后，μVision 会设置 ERRORLEVEL 来指示状态：

| ERRORLEVEL | 描述 |
|------------|------|
| 0 | 无错误或警告 |
| 1 | 仅警告 |
| 2 | 错误 |
| 3 | 致命错误 |
| 11 | 无法为写入打开项目文件 |
| 12 | 数据库中未找到指定名称的设备 |
| 13 | 写入项目文件错误 |
| 15 | 读取导入 XML 文件错误 |

## 使用场景示例

### 1. 自动化构建
```batch
UV4 -b PROJECT1.uvproj -j0 -o build.log
IF ERRORLEVEL 2 GOTO build_error
```

### 2. 自动化测试
```batch
UV4 -d PROJECT1.uvproj -j0
```

### 3. 批量编程
```batch
UV4 -f Programming.UVPROJ -o Prg_Output.txt
```

### 4. 多项目构建
```batch
UV4 -r "C:\Keil\ARM\Example-mpw.uvmpw" -q -o "c:\temp\log.txt"
```

## 注意事项
1. 如果未指定命令，μVision 将在交互式构建模式下打开项目文件
2. 如果未指定项目文件，μVision 将打开上次使用的项目文件
3. 使用 `-j0` 选项可以隐藏 GUI，适用于批处理测试
4. 对于多项目文件（.uvmpw），确保每个目标有不同的对象输出文件夹
5. 调试模式下可以使用 EXIT 命令退出调试会话

## Flash 编程示例
```batch
C:\Keil\UV4\UV4 -f Programming.UVPROJ -o Prg_Output.txt
```

输出示例：
```
Load "Flash\\Blinky.hex"
Erase Done.
Programming Done.
Verify OK.
Application running ...
```

## 参考信息
- 项目文件扩展名：`.uvproj`（单项目），`.uvmpw`（多项目）
- XML 导入文件需要符合 `project_import.xsd` 模式
- 设备名称可以从 Keil 设备数据库中获取