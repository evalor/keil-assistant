/**
 * BuildTool - Keil项目编译工具
 */

import * as vscode from 'vscode';
import { KeilChatTool, BuildResult, DiagnosticInfo } from '../types';

/**
 * 编译工具输入参数
 */
interface BuildToolInput {
    target?: string;
    rebuild?: boolean;
}

/**
 * Keil项目编译工具
 * 支持编译指定目标,可选重新编译,异步等待编译完成并返回结果
 */
export class BuildTool extends KeilChatTool {
    readonly name = 'keil-assistant_buildProject';
    readonly description = 'Build or rebuild a Keil project target. Returns compilation results including errors and warnings with file paths, line numbers, and error codes. Use this tool when: 1) User asks to compile/build/rebuild a Keil project or embedded firmware, 2) User mentions "build the project" or "compile the code", 3) User wants to check for compilation errors, 4) User asks to verify if the code compiles successfully.';
    readonly tags = ['build', 'compile', 'keil', 'embedded', 'firmware'];
    readonly inputSchema = {
        type: 'object',
        properties: {
            target: {
                type: 'string',
                description: 'The name of the specific target configuration to build (e.g., "Debug", "Release"). If omitted, the currently active target will be built.'
            },
            rebuild: {
                type: 'boolean',
                description: 'Set to true to perform a clean rebuild (recompile all files), or false for incremental build (compile only changed files). Default: false.'
            }
        }
    };

    constructor(private projectExplorer: any) {
        super();
    }

    /**
     * 准备工具调用 - 提供有用的进度消息
     */
    prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<BuildToolInput>,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.PreparedToolInvocation> {
        const { target, rebuild } = options.input;
        const action = rebuild ? 'Rebuilding' : 'Building';
        const targetName = target || 'active target';
        
        return {
            invocationMessage: `${action} Keil project target: ${targetName}`
        };
    }

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<BuildToolInput>,
        token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const outputChannel = vscode.window.createOutputChannel('Keil Assistant Chat Tools');
        
        try {
            const { target, rebuild = false } = options.input;
            outputChannel.appendLine(`[BuildTool] Starting ${rebuild ? 'rebuild' : 'build'} for target: ${target || 'active'}`);

            // 获取当前活动项目
            const activeProject = this.projectExplorer.currentActiveProject;
            if (!activeProject) {
                const errorMsg = 'No active Keil project found. Please open a project first.';
                outputChannel.appendLine(`[BuildTool] Error: ${errorMsg}`);
                return this.formatResult({
                    success: false,
                    exitCode: -1,
                    target: target || 'unknown',
                    errors: [],
                    errorCount: 0,
                    warningCount: 0,
                    logFile: '',
                    message: errorMsg
                });
            }

            // 获取目标
            let targetObj: any;
            if (target) {
                targetObj = activeProject.getTargetByName(target);
                if (!targetObj) {
                    const availableTargets = activeProject.getTargets().map((t: any) => t.targetName).join(', ');
                    return this.formatResult({
                        success: false,
                        exitCode: -1,
                        target: target,
                        errors: [],
                        errorCount: 0,
                        warningCount: 0,
                        logFile: '',
                        message: `Target '${target}' not found. Available targets: ${availableTargets}`
                    });
                }
            } else {
                targetObj = activeProject.getActiveTarget();
                if (!targetObj) {
                    return this.formatResult({
                        success: false,
                        exitCode: -1,
                        target: 'unknown',
                        errors: [],
                        errorCount: 0,
                        warningCount: 0,
                        logFile: '',
                        message: 'No active target found in the project.'
                    });
                }
            }

            // 创建Promise等待编译完成
            const buildPromise = new Promise<{ exitCode: number, target: any }>((resolve, reject) => {
                let isResolved = false;
                
                const timeoutId = setTimeout(() => {
                    if (!isResolved) {
                        isResolved = true;
                        disposable.dispose();
                        outputChannel.appendLine('[BuildTool] Build timeout after 5 minutes');
                        reject(new Error('Build timeout after 5 minutes'));
                    }
                }, 300000); // 5分钟超时

                const disposable = vscode.tasks.onDidEndTaskProcess((event: any) => {
                    const task = event.execution.task;
                    // 检查是否是我们的编译任务
                    if (task.definition.type === 'keil-task' &&
                        (task.name === 'build' || task.name === 'rebuild') &&
                        task.definition.prjID === activeProject.prjID &&
                        task.definition.targetName === targetObj.targetName) {
                        
                        if (!isResolved) {
                            isResolved = true;
                            clearTimeout(timeoutId);
                            disposable.dispose();
                            outputChannel.appendLine(`[BuildTool] Build completed with exit code: ${event.exitCode || 0}`);
                            resolve({ exitCode: event.exitCode || 0, target: targetObj });
                        }
                    }
                });

                // 处理取消
                const cancellationListener = token.onCancellationRequested(() => {
                    if (!isResolved) {
                        isResolved = true;
                        clearTimeout(timeoutId);
                        disposable.dispose();
                        cancellationListener.dispose();
                        outputChannel.appendLine('[BuildTool] Build cancelled by user');
                        reject(new Error('Build cancelled by user'));
                    }
                });
            });

            // 启动编译
            if (rebuild) {
                targetObj.rebuild();
            } else {
                targetObj.build();
            }

            // 等待编译完成
            const result = await buildPromise;

            // 等待一小段时间确保诊断信息已处理
            await new Promise(resolve => setTimeout(resolve, 500));

            // 处理诊断信息
            await result.target.processDiagnostics();

            // 提取诊断信息
            const diagnostics = result.target.getLastDiagnostics();
            const errors: DiagnosticInfo[] = [];
            let errorCount = 0;
            let warningCount = 0;

            diagnostics.forEach((diags: vscode.Diagnostic[], uriString: string) => {
                const uri = vscode.Uri.parse(uriString);
                diags.forEach((diag: vscode.Diagnostic) => {
                    const severity = diag.severity === vscode.DiagnosticSeverity.Error ? 'error' : 'warning';
                    if (severity === 'error') {
                        errorCount++;
                    } else {
                        warningCount++;
                    }

                    // 提取错误代码和消息
                    const match = diag.message.match(/^([^:]+):\s*(.*)$/);
                    const code = match ? match[1] : '';
                    const message = match ? match[2] : diag.message;

                    errors.push({
                        file: uri.fsPath,
                        line: diag.range.start.line + 1,
                        severity,
                        code,
                        message
                    });
                });
            });

            // 构建结果
            const buildResult: BuildResult = {
                success: result.exitCode === 0,
                exitCode: result.exitCode,
                target: targetObj.targetName,
                errors,
                errorCount,
                warningCount,
                logFile: targetObj.uv4LogFile?.path || ''
            };

            return this.formatResult(buildResult);

        } catch (error: any) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            outputChannel.appendLine(`[BuildTool] Error: ${errorMsg}`);
            outputChannel.show(true);
            
            return this.formatResult({
                success: false,
                exitCode: -1,
                target: options.input.target || 'unknown',
                errors: [],
                errorCount: 0,
                warningCount: 0,
                logFile: '',
                message: `Build failed: ${errorMsg}`
            });
        } finally {
            outputChannel.dispose();
        }
    }
}
