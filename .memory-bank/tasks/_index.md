# 任务索引

*最后更新: 2025-12-21*

## 进行中

*当前没有进行中的任务*

## 待办

- [TASK001] [为Copilot集成Chat Tools支持](./TASK001-integrate-chat-tools-for-copilot.md) - 将Keil Assistant功能作为对话工具开放给LLM，使Copilot能够自主调用C51项目操作

## 已完成

*Memory Bank刚刚初始化，暂无已完成任务*

## 已放弃

*暂无放弃的任务*

---

## 使用说明

### 创建新任务
当用户请求**add task**或**create task**时，我会：
1. 创建新的任务文件：`TASKXXX-taskname.md`
2. 记录任务详情、思考过程和实施计划
3. 更新此索引文件

### 更新任务
使用命令**update task [ID]**来：
1. 添加进度日志条目
2. 更新任务状态
3. 在此索引中反映变化

### 查看任务
使用命令**show tasks [filter]**来查看任务列表：
- **all**: 显示所有任务
- **active**: 仅显示进行中的任务
- **pending**: 仅显示待办任务
- **completed**: 仅显示已完成任务
- **recent**: 显示最近一周更新的任务

---

## 任务编号规则

任务ID格式：`TASK001`, `TASK002`, `TASK003`, ...

- 按创建顺序递增
- 三位数字，不足补零
- 不重复使用已删除任务的ID
