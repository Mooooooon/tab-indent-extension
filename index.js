// Tab缩进助手扩展
// 实现在输入框中按Tab键进行缩进的功能

// 导入必要的扩展功能
import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

// 扩展配置
const extensionName = 'tab-indent-helper';
const extensionFolderPath = `scripts/extensions/third-party/st-extension-example`;
const extensionSettings = extension_settings[extensionName];
const defaultSettings = {
  enabled: true,
  indentSpaces: 2,
};

// 已绑定事件的元素列表，避免重复绑定
const boundElements = new Set();

// 加载扩展设置
async function loadSettings() {
  // 创建设置如果不存在
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }

  // 更新UI中的设置
  $('#tab_indent_enabled').prop('checked', extension_settings[extensionName].enabled).trigger('input');
  $('#indent_spaces').val(extension_settings[extensionName].indentSpaces).trigger('input');
}

// Tab缩进功能启用状态改变
function onTabIndentEnabledChange(event) {
  const enabled = Boolean($(event.target).prop('checked'));
  extension_settings[extensionName].enabled = enabled;
  saveSettingsDebounced();

  // 根据启用状态添加或移除事件监听器
  if (enabled) {
    addTabListeners();
  } else {
    removeTabListeners();
  }
}

// 缩进空格数量改变
function onIndentSpacesChange(event) {
  const spaces = parseInt($(event.target).val()) || 2;
  extension_settings[extensionName].indentSpaces = Math.max(1, Math.min(8, spaces));
  saveSettingsDebounced();
}

// 获取指定数量的空格字符串
function getIndentString() {
  const spaces = extension_settings[extensionName].indentSpaces || 2;
  return ' '.repeat(spaces);
}

// 处理Tab键按下事件
function handleTabKeydown(event) {
  // 只处理Tab键
  if (event.key !== 'Tab') {
    return;
  }

  // 检查扩展是否启用
  if (!extension_settings[extensionName].enabled) {
    return;
  }

  // 阻止浏览器默认的Tab行为
  event.preventDefault();
  event.stopPropagation();

  const element = event.target;
  const indentString = getIndentString();
  const isShiftPressed = event.shiftKey;

  // 检查是否是文本输入元素
  if (element.tagName === 'TEXTAREA' || (element.tagName === 'INPUT' && element.type === 'text')) {
    const startPos = element.selectionStart;
    const endPos = element.selectionEnd;
    const value = element.value;

    if (isShiftPressed) {
      // Shift+Tab: 反缩进（移除缩进）
      if (startPos === endPos) {
        // 单光标位置的反缩进
        const lineStart = value.lastIndexOf('\n', startPos - 1) + 1;
        const lineEnd = value.indexOf('\n', startPos);
        const currentLineEnd = lineEnd === -1 ? value.length : lineEnd;
        const currentLine = value.slice(lineStart, currentLineEnd);

        // 检查行首是否有足够的空格可以移除
        let spacesToRemove = 0;
        for (let i = 0; i < Math.min(indentString.length, currentLine.length); i++) {
          if (currentLine[i] === ' ') {
            spacesToRemove++;
          } else {
            break;
          }
        }

        if (spacesToRemove > 0) {
          const newValue = value.slice(0, lineStart) + currentLine.slice(spacesToRemove) + value.slice(currentLineEnd);
          element.value = newValue;
          // 调整光标位置
          const newCursorPos = Math.max(lineStart, startPos - spacesToRemove);
          element.setSelectionRange(newCursorPos, newCursorPos);
        }
      } else {
        // 多行选中的反缩进
        const selectedText = value.slice(startPos, endPos);
        const beforeSelection = value.slice(0, startPos);
        const afterSelection = value.slice(endPos);

        // 找到选中文本的完整行范围
        const lineStartPos = beforeSelection.lastIndexOf('\n') + 1;
        const fullSelectionStart = lineStartPos;
        const fullSelectedText = value.slice(fullSelectionStart, endPos);

        const lines = fullSelectedText.split('\n');
        let totalRemovedSpaces = 0;
        let removedFromFirstLine = 0;

        // 为每一行移除缩进
        const unindentedLines = lines.map((line, index) => {
          let spacesToRemove = 0;
          for (let i = 0; i < Math.min(indentString.length, line.length); i++) {
            if (line[i] === ' ') {
              spacesToRemove++;
            } else {
              break;
            }
          }

          if (index === 0) {
            removedFromFirstLine = spacesToRemove;
          }
          totalRemovedSpaces += spacesToRemove;

          return spacesToRemove > 0 ? line.slice(spacesToRemove) : line;
        });

        const unindentedText = unindentedLines.join('\n');
        const newValue = value.slice(0, fullSelectionStart) + unindentedText + afterSelection;
        element.value = newValue;

        // 调整选中范围
        const newStartPos = Math.max(fullSelectionStart, startPos - removedFromFirstLine);
        const newEndPos = endPos - totalRemovedSpaces;
        element.setSelectionRange(newStartPos, newEndPos);
      }
    } else {
      // 普通Tab: 添加缩进（原有逻辑）
      if (startPos === endPos) {
        const newValue = value.slice(0, startPos) + indentString + value.slice(startPos);
        element.value = newValue;
        element.setSelectionRange(startPos + indentString.length, startPos + indentString.length);
      } else {
        // 如果选中了文本，处理多行缩进
        const selectedText = value.slice(startPos, endPos);
        const lines = selectedText.split('\n');

        // 为每一行添加缩进
        const indentedLines = lines.map(line => indentString + line);
        const indentedText = indentedLines.join('\n');

        const newValue = value.slice(0, startPos) + indentedText + value.slice(endPos);
        element.value = newValue;

        // 调整选中范围
        const newStartPos = startPos;
        const newEndPos = startPos + indentedText.length;
        element.setSelectionRange(newStartPos, newEndPos);
      }
    }

    // 触发input事件，确保其他功能能检测到文本变化
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
  // 对于contenteditable元素的处理
  else if (element.contentEditable === 'true' || element.isContentEditable) {
    const selection = window.getSelection();

    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);

      if (isShiftPressed) {
        // Shift+Tab: 反缩进处理
        if (range.collapsed) {
          // 单光标位置的反缩进
          const textNode = range.startContainer;
          if (textNode.nodeType === Node.TEXT_NODE) {
            const text = textNode.textContent;
            const cursorOffset = range.startOffset;

            // 找到当前行的开始
            const lineStart = text.lastIndexOf('\n', cursorOffset - 1) + 1;
            const lineText = text.slice(lineStart);

            // 检查行首空格
            let spacesToRemove = 0;
            for (let i = 0; i < Math.min(indentString.length, lineText.length); i++) {
              if (lineText[i] === ' ') {
                spacesToRemove++;
              } else {
                break;
              }
            }

            if (spacesToRemove > 0) {
              const newText = text.slice(0, lineStart) + lineText.slice(spacesToRemove);
              textNode.textContent = newText;
              const newCursorPos = Math.max(lineStart, cursorOffset - spacesToRemove);
              range.setStart(textNode, newCursorPos);
              range.setEnd(textNode, newCursorPos);
            }
          }
        } else {
          // 选中文本的反缩进
          const contents = range.extractContents();
          const textContent = contents.textContent;

          if (textContent.includes('\n')) {
            // 多行文本处理
            const lines = textContent.split('\n');
            const unindentedLines = lines.map(line => {
              let spacesToRemove = 0;
              for (let i = 0; i < Math.min(indentString.length, line.length); i++) {
                if (line[i] === ' ') {
                  spacesToRemove++;
                } else {
                  break;
                }
              }
              return spacesToRemove > 0 ? line.slice(spacesToRemove) : line;
            });
            const unindentedText = unindentedLines.join('\n');

            const textNode = document.createTextNode(unindentedText);
            range.insertNode(textNode);
          } else {
            // 单行文本处理
            let spacesToRemove = 0;
            for (let i = 0; i < Math.min(indentString.length, textContent.length); i++) {
              if (textContent[i] === ' ') {
                spacesToRemove++;
              } else {
                break;
              }
            }
            const unindentedText = spacesToRemove > 0 ? textContent.slice(spacesToRemove) : textContent;
            const textNode = document.createTextNode(unindentedText);
            range.insertNode(textNode);
          }
        }
      } else {
        // 普通Tab: 添加缩进（原有逻辑）
        if (range.collapsed) {
          const textNode = document.createTextNode(indentString);
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          // 处理选中的文本
          const contents = range.extractContents();
          const textContent = contents.textContent;

          if (textContent.includes('\n')) {
            // 多行文本处理
            const lines = textContent.split('\n');
            const indentedLines = lines.map(line => indentString + line);
            const indentedText = indentedLines.join('\n');

            const textNode = document.createTextNode(indentedText);
            range.insertNode(textNode);
          } else {
            // 单行文本处理
            const indentedText = indentString + textContent;
            const textNode = document.createTextNode(indentedText);
            range.insertNode(textNode);
          }
        }
      }
    }
  }
}

// 为页面中的输入元素添加Tab事件监听器
function addTabListeners() {
  // 使用事件委托，监听document上的keydown事件
  $(document).on('keydown.tabIndent', handleTabKeydown);
}

// 移除Tab事件监听器
function removeTabListeners() {
  $(document).off('keydown.tabIndent');
}

// 扩展加载时的初始化函数
jQuery(async () => {
  try {
    // 加载HTML设置界面
    const settingsHtml = await $.get(`${extensionFolderPath}/example.html`);

    // 将设置界面添加到扩展设置区域
    $('#extensions_settings').append(settingsHtml);

    // 绑定设置界面的事件监听器
    $('#tab_indent_enabled').on('change', onTabIndentEnabledChange);
    $('#indent_spaces').on('input', onIndentSpacesChange);

    // 加载保存的设置
    await loadSettings();

    // 如果扩展已启用，添加Tab监听器
    if (extension_settings[extensionName].enabled) {
      addTabListeners();
    }

    console.log('Tab缩进助手扩展已加载');
  } catch (error) {
    console.error('Tab缩进助手扩展加载失败:', error);
  }
});
