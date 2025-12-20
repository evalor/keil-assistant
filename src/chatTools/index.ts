/**
 * Chat Tools注册入口
 */

import * as vscode from 'vscode';
import { BuildTool } from './tools/BuildTool';
import { GetProjectInfoTool } from './tools/GetProjectInfoTool';

/**
 * 注册所有Chat Tools
 * @param context 扩展上下文
 * @param projectExplorer ProjectExplorer实例,用于访问项目和目标
 */
export function registerChatTools(context: vscode.ExtensionContext, projectExplorer: any): void {
    try {
        // 检查Language Model API是否可用
        if (!vscode.lm || !vscode.lm.registerTool) {
            console.warn('[Keil Assistant] Language Model API not available. Chat Tools will not be registered.');
            return;
        }

        const outputChannel = vscode.window.createOutputChannel('Keil Assistant Chat Tools');
        
        // 注册BuildTool
        try {
            const buildTool = new BuildTool(projectExplorer);
            const buildToolDisposable = vscode.lm.registerTool('keil-assistant_buildProject', buildTool);
            context.subscriptions.push(buildToolDisposable);
            outputChannel.appendLine('[Chat Tools] BuildTool registered: keil-assistant_buildProject');
        } catch (error) {
            outputChannel.appendLine(`[Chat Tools] Failed to register BuildTool: ${error}`);
            console.error('[Keil Assistant] Failed to register BuildTool:', error);
        }

        // 注册GetProjectInfoTool
        try {
            const getProjectInfoTool = new GetProjectInfoTool(projectExplorer);
            const infoToolDisposable = vscode.lm.registerTool('keil-assistant_getProjectInfo', getProjectInfoTool);
            context.subscriptions.push(infoToolDisposable);
            outputChannel.appendLine('[Chat Tools] GetProjectInfoTool registered: keil-assistant_getProjectInfo');
        } catch (error) {
            outputChannel.appendLine(`[Chat Tools] Failed to register GetProjectInfoTool: ${error}`);
            console.error('[Keil Assistant] Failed to register GetProjectInfoTool:', error);
        }

        outputChannel.appendLine('[Chat Tools] All tools registered successfully');
        console.log('[Keil Assistant] Chat Tools registered successfully');
        
        // 不要立即dispose outputChannel，让它保持打开以便调试
        context.subscriptions.push(outputChannel);
        
    } catch (error) {
        console.error('[Keil Assistant] Failed to register Chat Tools:', error);
        vscode.window.showErrorMessage(`Failed to register Keil Assistant Chat Tools: ${error}`);
    }
}
