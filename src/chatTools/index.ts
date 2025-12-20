/**
 * Chat Tools注册入口
 */

import * as vscode from 'vscode';
import { BuildTool } from './tools/BuildTool';
import { GetProjectInfoTool } from './tools/GetProjectInfoTool';
import { KeilChatParticipant, ChatParticipantState } from './KeilChatParticipant';

/**
 * 注册所有Chat Tools和Chat Participant
 * @param context 扩展上下文
 * @param projectExplorer ProjectExplorer实例,用于访问项目和目标
 */
export function registerChatTools(context: vscode.ExtensionContext, projectExplorer: any): void {
    console.log('[Keil Assistant] registerChatTools() called');
    
    try {
        // 检查Language Model API是否可用
        console.log('[Keil Assistant] Checking vscode.lm availability...');
        console.log('[Keil Assistant] vscode.lm exists:', !!vscode.lm);
        console.log('[Keil Assistant] vscode.lm.registerTool exists:', !!(vscode.lm && vscode.lm.registerTool));
        
        if (!vscode.lm || !vscode.lm.registerTool) {
            const msg = '[Keil Assistant] Language Model API not available. Chat Tools will not be registered.';
            console.warn(msg);
            vscode.window.showWarningMessage('Keil Assistant: Chat Tools require GitHub Copilot to be installed and enabled.');
            return;
        }

        const outputChannel = vscode.window.createOutputChannel('Keil Assistant Chat Tools');
        outputChannel.show(); // 自动显示输出频道
        outputChannel.appendLine('=================================================');
        outputChannel.appendLine('[Chat Tools] Starting registration...');
        outputChannel.appendLine('=================================================');
        
        // 注册BuildTool
        try {
            const buildTool = new BuildTool(projectExplorer);
            const buildToolDisposable = vscode.lm.registerTool('keil-assistant_buildProject', buildTool);
            context.subscriptions.push(buildToolDisposable);
            outputChannel.appendLine('[Chat Tools] BuildTool registered: keil-assistant_buildProject');
            console.log('[Keil Assistant] BuildTool registered successfully');
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
            console.log('[Keil Assistant] GetProjectInfoTool registered successfully');
        } catch (error) {
            outputChannel.appendLine(`[Chat Tools] Failed to register GetProjectInfoTool: ${error}`);
            console.error('[Keil Assistant] Failed to register GetProjectInfoTool:', error);
        }

        outputChannel.appendLine('[Chat Tools] All tools registered successfully');
        
        // 注册Chat Participant
        try {
            outputChannel.appendLine('\n[Chat Participant] Registering @keil participant...');
            const chatParticipantState = new ChatParticipantState();
            const keilChatParticipant = new KeilChatParticipant(context, chatParticipantState);
            context.subscriptions.push(keilChatParticipant);
            outputChannel.appendLine('[Chat Participant] @keil participant registered successfully');
            outputChannel.appendLine('[Chat Participant] Usage: Type "@keil" in Copilot Chat to use the Keil assistant');
        } catch (error) {
            outputChannel.appendLine(`[Chat Participant] Failed to register @keil participant: ${error}`);
            console.error('[Keil Assistant] Failed to register Chat Participant:', error);
        }
        
        // 验证工具是否在lm.tools中
        setTimeout(() => {
            outputChannel.appendLine('\n=================================================');
            outputChannel.appendLine('[Chat Tools] Verifying tool registration...');
            outputChannel.appendLine(`[Chat Tools] Total tools in lm.tools: ${vscode.lm.tools.length}`);
            
            const ourTools = vscode.lm.tools.filter(t => t.name.startsWith('keil-assistant_'));
            outputChannel.appendLine(`[Chat Tools] Our tools found: ${ourTools.length}`);
            
            ourTools.forEach(tool => {
                outputChannel.appendLine(`  - ${tool.name}`);
                outputChannel.appendLine(`    Description: ${tool.description}`);
                outputChannel.appendLine(`    Tags: ${tool.tags.join(', ')}`);
                outputChannel.appendLine(`    Has inputSchema: ${!!tool.inputSchema}`);
            });
            
            if (ourTools.length === 0) {
                outputChannel.appendLine('[Chat Tools] WARNING: No Keil Assistant tools found in lm.tools!');
            } else {
                outputChannel.appendLine('[Chat Tools] ✓ Tools successfully registered and available to LLM');
            }
            
            outputChannel.appendLine('=================================================');
            outputChannel.appendLine('[Chat Tools] Tips for using tools:');
            outputChannel.appendLine('  - Use @keil in Copilot Chat for best experience');
            outputChannel.appendLine('  - Try: "@keil Build the project"');
            outputChannel.appendLine('  - Try: "@keil Show me information about this project"');
            outputChannel.appendLine('  - Try: "@keil Compile and check for errors"');
            outputChannel.appendLine('  - Or use tool references: #keil-assistant_buildProject');
            outputChannel.appendLine('=================================================');
        }, 1000);
        
        console.log('[Keil Assistant] Chat Tools registered successfully');
        
        // 不要立即dispose outputChannel，让它保持打开以便调试
        context.subscriptions.push(outputChannel);
        
    } catch (error) {
        console.error('[Keil Assistant] Failed to register Chat Tools:', error);
        vscode.window.showErrorMessage(`Failed to register Keil Assistant Chat Tools: ${error}`);
    }
}
