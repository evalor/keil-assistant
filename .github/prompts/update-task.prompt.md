---
name: updateTask
description: Update a task in the memory bank.
argument-hint: What progress has been made on the tasks?
agent: agent
---

The user wants to update a task using the `update task [ID]` command. Users may not provide a specific task ID, so I need to deduce which task requires updating based on the context. When I cannot confirm which task needs to be updated, I will stop the update, list potentially relevant tasks, and ask the user for confirmation. Now, I will update the task according to the user’s prompt and the requirements of the memory bank.