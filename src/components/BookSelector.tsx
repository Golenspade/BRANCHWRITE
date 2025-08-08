import React, { useState, useEffect } from 'react';
import type { BookConfig } from '../types/index';
import { useAppStore } from '../stores/appStore';

interface CreateBookDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string, author: string, genre: string) => void;
}

function CreateBookDialog({ isOpen, onClose, onSubmit }: CreateBookDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    author: '',
    genre: '小说'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onSubmit(formData.name, formData.description, formData.author, formData.genre);
      setFormData({ name: '', description: '', author: '', genre: '小说' });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        width: '90%',
        maxWidth: '500px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          marginBottom: '1.5rem',
          color: '#111827'
        }}>
          创建新书籍
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              书籍名称 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="输入书籍名称..."
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              作者
            </label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              placeholder="输入作者姓名..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              类型
            </label>
            <select
              value={formData.genre}
              onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            >
              <option value="小说">小说</option>
              <option value="散文">散文</option>
              <option value="诗歌">诗歌</option>
              <option value="技术文档">技术文档</option>
              <option value="学术论文">学术论文</option>
              <option value="其他">其他</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="简要描述这本书的内容..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                backgroundColor: 'white',
                color: '#374151',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              取消
            </button>
            <button
              type="submit"
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '0.375rem',
                backgroundColor: '#8b5cf6',
                color: 'white',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              创建书籍
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface BookCardProps {
  book: BookConfig;
  onSelect: () => void;
  onDelete: () => void;
}

function BookCard({ book, onSelect, onDelete }: BookCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  return (
    <div
      onClick={onSelect}
      style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '1.5rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        e.currentTarget.style.borderColor = '#8b5cf6';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = '#e5e7eb';
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        style={{
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
          background: 'none',
          border: 'none',
          color: '#9ca3af',
          cursor: 'pointer',
          fontSize: '1.25rem',
          padding: '0.25rem'
        }}
        title="删除书籍"
      >
        ×
      </button>

      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '0.5rem',
          paddingRight: '2rem'
        }}>
          {book.name}
        </h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.875rem',
          color: '#6b7280'
        }}>
          <span>{book.author}</span>
          <span>•</span>
          <span>{book.genre}</span>
        </div>
      </div>

      {book.description && (
        <p style={{
          color: '#6b7280',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          marginBottom: '1rem'
        }}>
          {book.description.length > 100 
            ? `${book.description.substring(0, 100)}...` 
            : book.description}
        </p>
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.75rem',
        color: '#9ca3af'
      }}>
        <span>创建于 {formatDate(book.created_at)}</span>
        <span>最后修改 {formatDate(book.last_modified)}</span>
      </div>
    </div>
  );
}

interface BookSelectorProps {
  onBookSelected?: (bookId: string) => void;
}

export function BookSelector({ onBookSelected }: BookSelectorProps = {}) {
  const {
    books,
    isLoading,
    loadBooks,
    createBook,
    selectBook,
    deleteBook
  } = useAppStore();

  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const handleCreateBook = async (name: string, description: string, author: string, genre: string) => {
    try {
      await createBook(name, description, author, genre);
      setShowCreateDialog(false);
      // 重新加载书籍列表
      await loadBooks();
    } catch (error) {
      console.error('创建书籍失败:', error);
      // 这里可以添加错误提示
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (window.confirm('确定要删除这本书吗？此操作不可撤销。')) {
      await deleteBook(bookId);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* 头部 */}
        <div style={{
          textAlign: 'center',
          marginBottom: '3rem'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '1rem'
          }}>
            📚 BranchWrite1
          </h1>
          <p style={{
            fontSize: '1.125rem',
            color: '#6b7280',
            marginBottom: '2rem'
          }}>
            选择一本书开始写作，或创建新的书籍项目
          </p>
          
          <button
            onClick={() => setShowCreateDialog(true)}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(139, 92, 246, 0.2)'
            }}
          >
            ✨ 创建新书籍
          </button>
        </div>

        {/* 书籍列表 */}
        {isLoading ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#6b7280'
          }}>
            加载中...
          </div>
        ) : books.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📖</div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>还没有书籍</h3>
            <p>点击上方按钮创建您的第一本书</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onSelect={() => {
                  selectBook(book.id);
                  onBookSelected?.(book.id);
                }}
                onDelete={() => handleDeleteBook(book.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 创建书籍对话框 */}
      <CreateBookDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreateBook}
      />
    </div>
  );
}
