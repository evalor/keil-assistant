/**
 * Keil Chat Participant - 为Copilot提供 @keil 对话代理
 */

import * as vscode from 'vscode';

/**
 * Chat Participant 状态管理
 * 管理对话历史和消息
 */
export class ChatParticipantState {
    private _messages: vscode.LanguageModelChatMessage[] = [];

    /**
     * 获取最后一次工具结果
     */
    get lastToolResult(): (vscode.LanguageModelTextPart | vscode.LanguageModelToolResultPart | vscode.LanguageModelToolCallPart)[] {
        for (let i = this._messages.length - 1; i >= 0; i--) {
            const message = this._messages[i];
            for (const part of message.content) {
                if (part instanceof vscode.LanguageModelToolResultPart) {
                    return message.content;
                }
            }
        }
        return [];
    }

    /**
     * 获取第一条用户消息
     */
    get firstUserMessage(): vscode.LanguageModelTextPart | undefined {
        for (let i = 0; i < this._messages.length; i++) {
            const message = this._messages[i];
            if (message.role === vscode.LanguageModelChatMessageRole.User && message.content) {
                for (const part of message.content) {
                    if (part instanceof vscode.LanguageModelTextPart) {
                        return part;
                    }
                }
            }
        }
        return undefined;
    }

    /**
     * 获取所有消息
     */
    get messages(): vscode.LanguageModelChatMessage[] {
        return this._messages;
    }

    /**
     * 添加单条消息
     */
    addMessage(message: vscode.LanguageModelChatMessage): void {
        this._messages.push(message);
    }

    /**
     * 批量添加消息
     */
    addMessages(messages: vscode.LanguageModelChatMessage[]): void {
        this._messages.push(...messages);
    }

    /**
     * 重置状态（新对话开始时）
     */
    reset(): void {
        this._messages = [];
    }
}

/**
 * 工具调用信息
 */
interface IToolCall {
    tool: vscode.LanguageModelToolInformation;
    call: vscode.LanguageModelToolCallPart;
    result: Thenable<vscode.LanguageModelToolResult>;
}

/**
 * Keil Chat Participant
 * 提供 @keil 对话代理,集成 Keil 相关工具
 */
export class KeilChatParticipant implements vscode.Disposable {
    private participant: vscode.ChatParticipant;
    private disposables: vscode.Disposable[] = [];

    constructor(
        private context: vscode.ExtensionContext,
        private state: ChatParticipantState
    ) {
        // 创建 Chat Participant
        this.participant = vscode.chat.createChatParticipant(
            'keil',
            this.handleParticipantRequest.bind(this)
        );

        // 设置图标
        this.participant.iconPath = vscode.Uri.joinPath(
            context.extensionUri,
            'res/icons/icon.png'
        );

        this.disposables.push(this.participant);
    }

    /**
     * 处理 Participant 请求
     */
    private async handleParticipantRequest(
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        // 重置状态
        this.state.reset();

        // 选择 LLM 模型
        const models = await vscode.lm.selectChatModels({
            vendor: 'copilot',
            family: 'gpt-4o'
        });

        if (!models || models.length === 0) {
            stream.markdown('Unable to access Language Model. Please ensure GitHub Copilot is installed and enabled.');
            return;
        }

        const model = models[0];

        // 收集所有 Keil 相关工具
        const allTools: vscode.LanguageModelChatTool[] = [];
        for (const tool of vscode.lm.tools) {
            // 用户明确引用的工具 (使用类型守卫检查 tools 属性是否存在)
            const requestTools = (request as any).tools as Map<string, boolean> | undefined;
            if (requestTools && requestTools.has(tool.name) && requestTools.get(tool.name)) {
                allTools.push(tool);
            }
            // 自动添加所有 keil-assistant 工具
            else if (tool.name.startsWith('keil-assistant')) {
                allTools.push(tool);
            }
        }

        // 构建初始消息
        const systemMessage = vscode.LanguageModelChatMessage.Assistant(`
You are a helpful assistant for Keil uVision projects. You can help users with:
- Building and compiling Keil projects
- Getting project information
- Understanding project structure and configuration
- Troubleshooting build errors

Use the available tools to help users accomplish their tasks. Don't ask for confirmation before using tools, just use them when appropriate.
        `.trim());

        const userMessage = vscode.LanguageModelChatMessage.User(request.prompt);

        this.state.addMessages([systemMessage, userMessage]);

        const toolReferences = [...request.toolReferences];

        // LLM 请求选项
        const options: vscode.LanguageModelChatRequestOptions = {
            justification: 'Answering user questions about Keil uVision projects.'
        };

        const commands: vscode.Command[] = [];

        /**
         * 递归调用 LLM,处理工具调用
         */
        const runWithFunctions = async (): Promise<void> => {
            // 如果有明确引用的工具,强制使用
            const requestedTool = toolReferences.shift();
            if (requestedTool) {
                options.toolMode = vscode.LanguageModelChatToolMode.Required;
                options.tools = allTools.filter(tool => tool.name === requestedTool.name);
            } else {
                options.toolMode = undefined;
                options.tools = allTools;
            }

            const toolCalls: IToolCall[] = [];
            const response = await model.sendRequest(this.state.messages, options, token);

            // 处理响应流
            for await (const part of response.stream) {
                if (part instanceof vscode.LanguageModelTextPart) {
                    // 显示文本响应
                    stream.markdown(part.value);
                }
                else if (part instanceof vscode.LanguageModelToolCallPart) {
                    // LLM 决定调用工具
                    const tool = vscode.lm.tools.find(t => t.name === part.name);
                    if (!tool) {
                        throw new Error(`Tool not found: ${part.name}`);
                    }

                    let input: any;
                    try {
                        input = part.input;
                    } catch (err) {
                        throw new Error(`Invalid tool parameters: ${JSON.stringify(part.input)}. ${(err as Error).message}`);
                    }

                    const invocationOptions: vscode.LanguageModelToolInvocationOptions<any> = {
                        input,
                        toolInvocationToken: request.toolInvocationToken
                    };

                    toolCalls.push({
                        call: part,
                        result: vscode.lm.invokeTool(tool.name, invocationOptions, token),
                        tool
                    });
                }
            }

            // 如果有工具调用,处理结果并继续对话
            if (toolCalls.length > 0) {
                // 记录 LLM 的工具调用决策
                const assistantMsg = vscode.LanguageModelChatMessage.Assistant('');
                assistantMsg.content = toolCalls.map(toolCall =>
                    new vscode.LanguageModelToolCallPart(
                        toolCall.call.callId,
                        toolCall.tool.name,
                        toolCall.call.input
                    )
                );
                this.state.addMessage(assistantMsg);

                let shownToUser = false;

                // 执行每个工具并收集结果
                for (const toolCall of toolCalls) {
                    const toolCallResult = await toolCall.result;

                    const additionalContent: vscode.LanguageModelTextPart[] = [];
                    let result: vscode.LanguageModelToolResultPart | undefined;

                    // 处理工具返回的内容
                    for (let i = 0; i < toolCallResult.content.length; i++) {
                        const part = toolCallResult.content[i];
                        if (!(part instanceof vscode.LanguageModelTextPart)) {
                            // 非文本内容,跳过
                            result = new vscode.LanguageModelToolResultPart(toolCall.call.callId, toolCallResult.content);
                            continue;
                        }

                        // 检查是否应该向用户显示
                        // (工具可以返回特殊标记来控制显示)
                        if (!result) {
                            result = new vscode.LanguageModelToolResultPart(toolCall.call.callId, [part]);
                        } else {
                            additionalContent.push(part);
                        }
                    }

                    // 将工具结果添加到消息历史
                    const message = vscode.LanguageModelChatMessage.User('');
                    message.content = [result!];
                    this.state.addMessage(message);

                    if (additionalContent.length > 0) {
                        const additionalMessage = vscode.LanguageModelChatMessage.User('');
                        additionalMessage.content = additionalContent;
                        this.state.addMessage(additionalMessage);
                    }
                }

                // 告诉 LLM 工具已执行
                this.state.addMessage(
                    vscode.LanguageModelChatMessage.User(
                        `Above is the result of calling the functions ${toolCalls.map(call => call.tool.name).join(', ')}. ${shownToUser ? 'The user can see the result of the tool call.' : ''}`
                    )
                );

                // 继续对话,让 LLM 基于工具结果生成最终回答
                return runWithFunctions();
            }
        };

        try {
            await runWithFunctions();

            // 添加任何命令按钮
            if (commands.length > 0) {
                for (const command of commands) {
                    stream.button(command);
                }
            }
        } catch (error) {
            stream.markdown(`\n\n⚠️ Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}
