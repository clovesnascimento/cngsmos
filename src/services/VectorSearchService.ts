import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as sqlite3 from 'sqlite3';

export interface SearchResult {
    path: string;
    score: number;
    preview: string;
}

export class VectorSearchService {
    private _indexDir: string;
    private _dbPath: string;
    private _db: sqlite3.Database | null = null;

    constructor(private readonly _workspaceRoot: string) {
        this._indexDir = path.join(_workspaceRoot, '.cngsm', 'index');
        this._dbPath = path.join(this._indexDir, 'rag_memory.sqlite');
        
        if (!fs.existsSync(this._indexDir)) {
            fs.mkdirSync(this._indexDir, { recursive: true });
        }
    }

    /**
     * Inicializa o banco de dados e as tabelas (incluindo FTS5).
     */
    private async _getDb(): Promise<sqlite3.Database> {
        if (this._db) return this._db;

        return new Promise((resolve, reject) => {
            this._db = new sqlite3.Database(this._dbPath, async (err) => {
                if (err) return reject(err);
                
                try {
                    await this._initSchema();
                    resolve(this._db!);
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    private async _initSchema(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this._db) return reject('DB not initialized');

            this._db.serialize(() => {
                // Tabela de metadados e chunks (Real)
                this._db!.run(`
                    CREATE TABLE IF NOT EXISTS chunks (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        path TEXT,
                        source TEXT,
                        content TEXT,
                        metadata TEXT,
                        timestamp INTEGER
                    )
                `);

                // Tabela Virtual FTS5 para Hybrid Search (Palavras-chave)
                this._db!.run(`
                    CREATE VIRTUAL TABLE IF NOT EXISTS fts_chunks USING fts5(
                        content,
                        path,
                        content='chunks',
                        content_rowid='id'
                    )
                `);

                // Triggers para manter o FTS sincronizado
                this._db!.run(`
                    CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
                        INSERT INTO fts_chunks(rowid, content, path) VALUES (new.id, new.content, new.path);
                    END;
                `);

                this._db!.run(`
                    CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
                        INSERT INTO fts_chunks(fts_chunks, rowid, content, path) VALUES('delete', old.id, old.content, old.path);
                    END;
                `);

                this._db!.run(`
                    CREATE TRIGGER IF NOT EXISTS chunks_au AFTER UPDATE ON chunks BEGIN
                        INSERT INTO fts_chunks(fts_chunks, rowid, content, path) VALUES('delete', old.id, old.content, old.path);
                        INSERT INTO fts_chunks(rowid, content, path) VALUES (new.id, new.content, new.path);
                    END;
                `, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    /**
     * Varre o projeto e reconstrói o índice básico de palavras-chave.
     */
    public async rebuildIndex(onProgress: (percent: number) => void): Promise<void> {
        const db = await this._getDb();
        const files = await vscode.workspace.findFiles('**/*.{ts,js,md,py}', '**/node_modules/**');
        const total = files.length;
        
        // Limpar índice antigo (Legacy JSON files are ignored by not being read)
        await new Promise<void>((resolve, reject) => {
            db.run('DELETE FROM chunks', (err) => err ? reject(err) : resolve());
        });

        for (let i = 0; i < total; i++) {
            const file = files[i];
            const content = await fs.promises.readFile(file.fsPath, 'utf8');
            const relativePath = vscode.workspace.asRelativePath(file);
            
            await new Promise<void>((resolve, reject) => {
                db.run(
                    'INSERT INTO chunks (path, source, content, timestamp) VALUES (?, ?, ?, ?)',
                    [relativePath, 'local', content, Date.now()],
                    (err) => err ? reject(err) : resolve()
                );
            });
            
            onProgress(Math.round(((i + 1) / total) * 100));
        }
    }

    /**
     * Busca por contexto baseada em query usando FTS5 (BM25).
     */
    public async search(query: string): Promise<SearchResult[]> {
        const db = await this._getDb();
        const cleanQuery = query.replace(/['"]/g, ''); // Sanitização básica

        return new Promise((resolve, reject) => {
            const sql = `
                SELECT chunks.path, chunks.source, bm25(fts_chunks) as rank, 
                       snippet(fts_chunks, 0, '[MATCH]', '[/MATCH]', '...', 20) as snippet
                FROM fts_chunks
                JOIN chunks ON chunks.id = fts_chunks.rowid
                WHERE fts_chunks MATCH ?
                ORDER BY rank
                LIMIT 5
            `;

            db.all(sql, [cleanQuery], (err, rows: any[]) => {
                if (err) return reject(err);

                const results: SearchResult[] = rows.map(row => ({
                    path: row.path,
                    score: Math.abs(row.rank),
                    preview: `[${row.source.toUpperCase()}] ${row.snippet}`
                }));

                resolve(results);
            });
        });
    }

    /**
     * Adiciona memória externa (ex: documentação web) ao índice.
     */
    public async addExternalMemory(url: string, content: string): Promise<void> {
        const db = await this._getDb();
        const hostname = new URL(url).hostname;
        const pathLabel = `WEB://${hostname}`;

        await new Promise<void>((resolve, reject) => {
            db.run(
                'INSERT INTO chunks (path, source, content, timestamp) VALUES (?, ?, ?, ?)',
                [pathLabel, 'web', content, Date.now()],
                (err) => err ? reject(err) : resolve()
            );
        });
    }
}
