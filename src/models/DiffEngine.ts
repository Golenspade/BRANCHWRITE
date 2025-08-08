import type { DiffResult, DiffChange } from '../types/index';

export class DiffEngine {
  /**
   * 比较两段文本，生成差异结果
   */
  diff(oldText: string, newText: string): DiffResult {
    const changes = this.computeDiff(oldText, newText);
    
    return {
      oldText,
      newText,
      changes,
    };
  }

  /**
   * 计算文本差异（基于行的比较）
   */
  private computeDiff(oldText: string, newText: string): DiffChange[] {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    
    // 使用 LCS (Longest Common Subsequence) 算法
    const lcs = this.longestCommonSubsequence(oldLines, newLines);
    
    return this.generateChanges(oldLines, newLines, lcs);
  }

  /**
   * 最长公共子序列算法
   */
  private longestCommonSubsequence(oldLines: string[], newLines: string[]): number[][] {
    const m = oldLines.length;
    const n = newLines.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (oldLines[i - 1] === newLines[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    return dp;
  }

  /**
   * 根据 LCS 结果生成变更列表
   */
  private generateChanges(oldLines: string[], newLines: string[], lcs: number[][]): DiffChange[] {
    const changes: DiffChange[] = [];
    let i = oldLines.length;
    let j = newLines.length;
    let oldLineNum = oldLines.length;
    let newLineNum = newLines.length;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
        // 相同的行
        changes.unshift({
          type: 'unchanged',
          value: oldLines[i - 1],
          lineNumber: oldLineNum,
        });
        i--;
        j--;
        oldLineNum--;
        newLineNum--;
      } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
        // 新增的行
        changes.unshift({
          type: 'added',
          value: newLines[j - 1],
          lineNumber: newLineNum,
        });
        j--;
        newLineNum--;
      } else if (i > 0) {
        // 删除的行
        changes.unshift({
          type: 'removed',
          value: oldLines[i - 1],
          lineNumber: oldLineNum,
        });
        i--;
        oldLineNum--;
      }
    }

    return changes;
  }

  /**
   * 计算字符级别的差异（用于更精细的比较）
   */
  diffChars(oldText: string, newText: string): DiffChange[] {
    const changes: DiffChange[] = [];
    let i = 0, j = 0;

    while (i < oldText.length || j < newText.length) {
      if (i < oldText.length && j < newText.length && oldText[i] === newText[j]) {
        // 相同字符
        let start = i;
        while (i < oldText.length && j < newText.length && oldText[i] === newText[j]) {
          i++;
          j++;
        }
        changes.push({
          type: 'unchanged',
          value: oldText.slice(start, i),
        });
      } else {
        // 找到下一个匹配点
        const matchPoint = this.findNextMatch(oldText, newText, i, j);
        
        if (matchPoint) {
          // 处理删除的部分
          if (matchPoint.oldIndex > i) {
            changes.push({
              type: 'removed',
              value: oldText.slice(i, matchPoint.oldIndex),
            });
          }
          
          // 处理新增的部分
          if (matchPoint.newIndex > j) {
            changes.push({
              type: 'added',
              value: newText.slice(j, matchPoint.newIndex),
            });
          }
          
          i = matchPoint.oldIndex;
          j = matchPoint.newIndex;
        } else {
          // 没有找到匹配点，处理剩余部分
          if (i < oldText.length) {
            changes.push({
              type: 'removed',
              value: oldText.slice(i),
            });
            i = oldText.length;
          }
          
          if (j < newText.length) {
            changes.push({
              type: 'added',
              value: newText.slice(j),
            });
            j = newText.length;
          }
        }
      }
    }

    return changes;
  }

  /**
   * 找到下一个匹配点
   */
  private findNextMatch(oldText: string, newText: string, startOld: number, startNew: number): { oldIndex: number; newIndex: number } | null {
    const maxLookAhead = 50; // 限制搜索范围以提高性能
    
    for (let len = 1; len <= maxLookAhead; len++) {
      for (let i = startOld; i <= Math.min(startOld + maxLookAhead, oldText.length - len); i++) {
        const substring = oldText.slice(i, i + len);
        const newIndex = newText.indexOf(substring, startNew);
        
        if (newIndex !== -1 && newIndex <= startNew + maxLookAhead) {
          return { oldIndex: i, newIndex };
        }
      }
    }
    
    return null;
  }

  /**
   * 格式化差异结果为可读的文本
   */
  formatDiff(changes: DiffChange[]): string {
    return changes.map(change => {
      switch (change.type) {
        case 'added':
          return `+ ${change.value}`;
        case 'removed':
          return `- ${change.value}`;
        case 'unchanged':
          return `  ${change.value}`;
        default:
          return change.value;
      }
    }).join('\n');
  }

  /**
   * 计算差异统计信息
   */
  getDiffStats(changes: DiffChange[]): { added: number; removed: number; unchanged: number } {
    const stats = { added: 0, removed: 0, unchanged: 0 };
    
    changes.forEach(change => {
      stats[change.type]++;
    });
    
    return stats;
  }
}
